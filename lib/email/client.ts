/**
 * Client Resend — envoi transactionnel, EXCLUSIVEMENT côté serveur (§5.2).
 *
 * Ce module ne doit jamais être importé depuis un composant client : la clé
 * API n'a aucune raison d'atteindre le navigateur. Il est volontairement
 * dépourvu de "use client" et n'utilise que des API Node.
 *
 * Trois garanties :
 *  - NON BLOQUANT : aucune fonction ne lève. Un envoi qui échoue renvoie
 *    { ok: false } et laisse le parcours utilisateur intact (§5.2).
 *  - IDEMPOTENT : chaque envoi porte une clé d'idempotence transmise à
 *    Resend, qui dédoublonne côté serveur. Un double-clic, un retry réseau ou
 *    un re-rendu ne peuvent pas produire deux emails.
 *  - RETRY : deux tentatives supplémentaires sur erreur transitoire, avec
 *    backoff, puis journalisation.
 */
import { Resend } from "resend";
import { warnIfMailAddressesCollide } from "@/lib/env";

export interface SendResult {
  ok: boolean;
  id?: string;
  /** Renseigné quand l'envoi a échoué — journalisé, jamais montré au lead. */
  error?: string;
  /** Vrai quand aucune clé n'est configurée : l'email est simulé, pas envoyé. */
  mocked?: boolean;
  /** Vrai quand Resend refuse l'expéditeur faute de domaine vérifié. */
  domainNotVerified?: boolean;
}

export interface SendArgs {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  /** Clé d'idempotence — même clé = un seul envoi, garanti par Resend. */
  idempotencyKey: string;
  replyTo?: string;
  /** Étiquettes Resend, pour filtrer les envois dans le tableau de bord. */
  tags?: { name: string; value: string }[];
}

const RETRIES = 2;
const BASE_DELAY_MS = 400;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let client: Resend | null = null;
function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

/** Expéditeur. Bascule vers le domaine vérifié par simple variable (§5.5). */
export function mailFrom(): string {
  return process.env.MAIL_FROM ?? "RD Portage <onboarding@resend.dev>";
}

/** Destinataire interne des copies E2/E4. */
export function mailInternalTo(): string | null {
  return process.env.MAIL_INTERNAL_TO ?? null;
}

/**
 * Erreurs qui méritent une nouvelle tentative. Une adresse invalide ou une
 * clé refusée ne sera jamais acceptée au deuxième essai : on ne réessaie que
 * ce qui est transitoire.
 */
function isTransient(message: string): boolean {
  // Un domaine non vérifié ne le sera pas davantage au deuxième essai :
  // réessayer masquerait la cause réelle derrière trois échecs identiques.
  if (isDomainNotVerified(message)) return false;
  return /rate_limit|internal_server_error|application_error|timeout|ECONNRESET|ETIMEDOUT|fetch failed/i.test(message);
}

/**
 * Tant que les enregistrements DNS ne sont pas posés, Resend refuse tout
 * envoi depuis @rdportage.com. C'est une erreur de CONFIGURATION, pas un
 * incident : elle doit être nommée pour ce qu'elle est, avec le remède.
 */
function isDomainNotVerified(message: string): boolean {
  return /not verified|domain.*verif|invalid_from_address|verify a domain/i.test(message);
}

export async function sendEmail(args: SendArgs): Promise<SendResult> {
  warnIfMailAddressesCollide();
  const resend = getClient();

  // Mode simulé : sans clé, le parcours reste testable de bout en bout et
  // l'envoi est tracé dans les logs — cohérent avec le mode mock du CRM.
  if (!resend) {
    console.info(
      "[email:mock] envoi simulé",
      JSON.stringify({ to: args.to, subject: args.subject, idempotencyKey: args.idempotencyKey }),
    );
    return { ok: true, mocked: true };
  }

  let lastError = "";
  for (let attempt = 1; attempt <= RETRIES + 1; attempt++) {
    try {
      const { data, error } = await resend.emails.send(
        {
          from: mailFrom(),
          to: args.to,
          subject: args.subject,
          html: args.html,
          text: args.text,
          replyTo: args.replyTo,
          tags: args.tags,
        },
        { idempotencyKey: args.idempotencyKey },
      );

      if (!error) return { ok: true, id: data?.id };

      lastError = `${error.name}: ${error.message}`;
      if (!isTransient(lastError) || attempt > RETRIES) break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (!isTransient(lastError) || attempt > RETRIES) break;
    }
    await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
  }

  // Observabilité (§4.5) : un email perdu ne doit jamais l'être en silence.
  if (isDomainNotVerified(lastError)) {
    console.error(
      "[email] DOMAINE NON VÉRIFIÉ CHEZ RESEND — aucun email ne partira depuis cet expéditeur. " +
        `Expéditeur refusé : ${mailFrom()}. ` +
        "Poser les enregistrements DNS (voir rapport-maintenance.md §4), ou repasser MAIL_FROM sur le domaine de test " +
        "Resend (RD Portage <onboarding@resend.dev>) le temps de la propagation. " +
        JSON.stringify({ to: args.to, idempotencyKey: args.idempotencyKey, error: lastError }),
    );
    return { ok: false, error: lastError, domainNotVerified: true };
  }
  console.error(
    "[email] échec d'envoi après retries",
    JSON.stringify({ to: args.to, subject: args.subject, idempotencyKey: args.idempotencyKey, error: lastError }),
  );
  return { ok: false, error: lastError };
}
