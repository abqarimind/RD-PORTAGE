/**
 * Orchestration des envois transactionnels (§5.1).
 *
 *   E1 — récapitulatif au lead        E2 — copie intégrale en interne
 *   E3 — confirmation d'inscription   E4 — notification de nouveau lead
 *
 * E2 et E4 sont des envois SÉPARÉS et non un Bcc : le client doit pouvoir les
 * filtrer dans sa boîte, et ils doivent partir même si l'envoi au lead
 * échoue. C'est pourquoi les deux promesses sont lancées ensemble et
 * attendues avec allSettled : aucun des deux ne conditionne l'autre.
 *
 * Aucune fonction de ce module ne lève : l'échec d'un email ne casse jamais
 * le parcours utilisateur ni l'affichage du résultat (§5.2).
 */
import type { SimulationResultPayload } from "@/types/simulation-result";
import { mailInternalTo, sendEmail, type SendResult } from "./client";
import { emailDemandeDiagnosticInterne, emailDemandeDiagnosticLead } from "./templates/diagnostic";
import { emailRecapInterne, emailRecapLead } from "./templates/recap";

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
  kind: "recap" | "diagnostic",
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
      tags: [
        { name: "type", value: kind },
        { name: "destinataire", value: "lead" },
      ],
    }),
    internalTo
      ? sendEmail({
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

/** E1 + E2 — fin de simulation, email renseigné. */
export function sendRecap(payload: SimulationResultPayload, opts: DeliveryOptions = {}): Promise<DeliveryReport> {
  return deliver(
    "recap",
    payload,
    emailRecapLead(payload, opts.unsubscribeUrl),
    emailRecapInterne(payload, opts.alerteInterne),
  );
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
