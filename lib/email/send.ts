/**
 * Orchestration des envois transactionnels (§5.1).
 *
 *   E1 — récapitulatif au lead
 *   Notification « Nouveau lead simulateur » — à l'équipe, à chaque lead (14/10)
 *   E3 — accusé de demande de diagnostic   E4 — copie interne de la demande
 *
 * Les envois internes sont SÉPARÉS et non un Bcc : le client doit pouvoir les
 * filtrer dans sa boîte, et ils doivent partir même si l'envoi au lead
 * échoue. La notification de lead est envoyée en arrière-plan par /api/lead
 * (waitUntil), avec davantage de tentatives : elle ne retarde jamais la
 * réponse au prospect.
 *
 * Aucune fonction de ce module ne lève : l'échec d'un email ne casse jamais
 * le parcours utilisateur ni l'affichage du résultat (§5.2).
 */
import type { SimulationResultPayload } from "@/types/simulation-result";
import { mailFromInterne, mailInternalTo, mailReplyTo, sendEmail, type SendResult } from "./client";
import { emailDemandeDiagnosticInterne, emailDemandeDiagnosticLead } from "./templates/diagnostic";
import { emailNouveauLead, type NouveauLeadArgs } from "./templates/nouveau-lead";
import { emailRecapLead } from "./templates/recap";

export interface DeliveryReport {
  lead: SendResult;
  interne: SendResult | null;
}

/**
 * Clé d'idempotence : une même simulation ne peut pas produire deux fois le
 * même email, quel que soit le nombre de soumissions, de retries réseau ou
 * de re-rendus. Resend dédoublonne sur cette clé côté serveur, ce qui tient
 * même entre deux invocations serverless distinctes.
 */
const key = (kind: string, simulationId: string) => `rdp-${kind}-${simulationId}`;

async function deliver(
  kind: "diagnostic",
  payload: SimulationResultPayload,
  lead: { subject: string; html: string; text: string },
  interne: { subject: string; html: string; text: string },
): Promise<DeliveryReport> {
  const internalTo = mailInternalTo();

  const [leadResult, interneResult] = await Promise.allSettled([
    sendEmail({
      to: payload.identite.email,
      subject: lead.subject,
      html: lead.html,
      text: lead.text,
      idempotencyKey: key(`${kind}-lead`, payload.meta.simulationId),
      // « Répondre » depuis la boîte du prospect écrit à l'entreprise (D5).
      replyTo: mailReplyTo(),
      tags: [
        { name: "type", value: kind },
        { name: "destinataire", value: "lead" },
      ],
    }),
    internalTo
      ? sendEmail({
          from: mailFromInterne(),
          to: internalTo,
          subject: interne.subject,
          html: interne.html,
          text: interne.text,
          idempotencyKey: key(`${kind}-interne`, payload.meta.simulationId),
          replyTo: payload.identite.email,
          tags: [
            { name: "type", value: kind },
            { name: "destinataire", value: "interne" },
          ],
        })
      : Promise.resolve<SendResult>({ ok: false, error: "MAIL_INTERNAL_TO non configuré" }),
  ]);

  const unwrap = (r: PromiseSettledResult<SendResult>): SendResult =>
    r.status === "fulfilled" ? r.value : { ok: false, error: String(r.reason) };

  if (!internalTo) {
    console.warn("[email] MAIL_INTERNAL_TO non configuré — aucune copie interne envoyée.");
  }

  return { lead: unwrap(leadResult), interne: internalTo ? unwrap(interneResult) : null };
}

export interface DeliveryOptions {
  unsubscribeUrl?: string;
  /**
   * Message d'alerte à faire figurer dans l'email interne — typiquement
   * l'échec d'une écriture CRM. L'email interne porte alors les données
   * brutes du lead, qui reste récupérable à la main (§4.2).
   */
  alerteInterne?: string;
}

/** E1 — fin de simulation : le récapitulatif au lead. */
export function sendRecapLead(payload: SimulationResultPayload, opts: DeliveryOptions = {}): Promise<SendResult> {
  const mail = emailRecapLead(payload, opts.unsubscribeUrl);
  return sendEmail({
    to: payload.identite.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    idempotencyKey: key("recap-lead", payload.meta.simulationId),
    replyTo: mailReplyTo(),
    tags: [
      { name: "type", value: "recap" },
      { name: "destinataire", value: "lead" },
    ],
  }).catch((err): SendResult => ({ ok: false, error: String(err) }));
}

/** Tentatives supplémentaires de la notification interne (backoff 0,4 s → 6,4 s). */
const NOTIFICATION_RETRIES = 4;

/**
 * Notification interne d'un nouveau lead — minimum non négociable : elle part
 * à chaque lead, réessaie sur toute erreur non liée à la configuration, et ne
 * lève jamais. Renvoie null quand aucun destinataire n'est configuré.
 */
export async function sendNouveauLead(args: NouveauLeadArgs): Promise<SendResult | null> {
  const to = mailInternalTo();
  if (!to) {
    console.error("[email] MAIL_INTERNAL_TO non configuré — notification de lead NON envoyée", JSON.stringify({ leadId: args.lead.lead_id }));
    return null;
  }
  const mail = emailNouveauLead(args);
  return sendEmail({
    from: mailFromInterne(),
    to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    idempotencyKey: key("lead-interne", args.lead.lead_id),
    // « Répondre » écrit directement au prospect.
    replyTo: args.lead.identity.email,
    tags: [
      { name: "type", value: "nouveau_lead" },
      { name: "destinataire", value: "interne" },
    ],
    retries: NOTIFICATION_RETRIES,
    retryOnAnyError: true,
  }).catch((err): SendResult => ({ ok: false, error: String(err) }));
}

/**
 * E3 + E4 — demande de diagnostic (§4.1).
 * Ce couple s'appelait « confirmation d'inscription » : le nom était faux.
 * Dans ce tunnel l'inscription EST le lead gate, déjà couvert par E1/E2 ;
 * le clic vers le Diagnostic 30 min est une demande de rendez-vous, donc un
 * signal plus fort, et non un doublon.
 */
export function sendDemandeDiagnostic(payload: SimulationResultPayload, opts: DeliveryOptions = {}): Promise<DeliveryReport> {
  return deliver(
    "diagnostic",
    payload,
    emailDemandeDiagnosticLead(payload, opts.unsubscribeUrl),
    emailDemandeDiagnosticInterne(payload, opts.alerteInterne),
  );
}
