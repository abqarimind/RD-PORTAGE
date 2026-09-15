/**
 * CRM facade used by the app. Provider chosen via CRM_PROVIDER
 * (mock | resend | brevo | airtable | google-sheet | custom), default mock.
 * Every write goes through the reliable queue (journal + 3 retries).
 */
import type { CRMAdapter } from "./adapter";
import { airtableAdapter } from "./airtable";
import { brevoAdapter } from "./brevo";
import { mockAdapter } from "./mock";
import { resendAdapter } from "./resend";
import { reliableWrite } from "./queue";
import type { FunnelEvent, Lead } from "./schema";
import { customCrmAdapter, googleSheetAdapter } from "./stubs";

const ADAPTERS: Record<string, CRMAdapter> = {
  mock: mockAdapter,
  resend: resendAdapter,
  brevo: brevoAdapter,
  airtable: airtableAdapter,
  "google-sheet": googleSheetAdapter,
  custom: customCrmAdapter,
};

/**
 * Un stockage non durable ne doit plus pouvoir passer inaperçu (§4.2).
 *
 * En production, l'adaptateur `mock` ne conserve RIEN : sa Map est vide à
 * chaque invocation serverless et le journal NDJSON est écrit sur un système
 * de fichiers éphémère. Du trafic payant arrivant dans cette configuration
 * perdrait définitivement des leads. L'avertissement est émis une seule fois
 * par processus pour rester lisible dans les logs.
 */
let mockWarned = false;
function warnIfNotDurable(provider: string): void {
  if (provider !== "mock" || process.env.NODE_ENV !== "production" || mockWarned) return;
  mockWarned = true;
  console.error(
    "[crm] CONFIGURATION NON DURABLE — CRM_PROVIDER=mock en production : " +
      "les leads ne sont conservés NULLE PART (Map en mémoire + système de fichiers éphémère). " +
      "Définir CRM_PROVIDER=resend (la clé RESEND_API_KEY est déjà là pour le transactionnel), " +
      "ou CRM_PROVIDER=airtable (AIRTABLE_API_KEY, AIRTABLE_BASE_ID), ou CRM_PROVIDER=brevo.",
  );
}

export function getAdapter(): CRMAdapter {
  const provider = process.env.CRM_PROVIDER ?? "mock";
  const adapter = ADAPTERS[provider];
  if (!adapter) throw new Error(`Unknown CRM_PROVIDER "${provider}"`);
  warnIfNotDurable(provider);
  return adapter;
}

/** Vrai quand le stockage courant ne survit pas à la requête. */
export function storageIsDurable(): boolean {
  const provider = process.env.CRM_PROVIDER ?? "mock";
  return provider !== "mock";
}

export const crm = {
  upsertLead: (lead: Lead) => reliableWrite("upsertLead", lead, () => getAdapter().upsertLead(lead)),
  appendEvent: (leadId: string, event: FunnelEvent) =>
    reliableWrite("appendEvent", { leadId, event }, () => getAdapter().appendEvent(leadId, event)),
  triggerSequence: (leadId: string, sequenceId: string) =>
    reliableWrite("triggerSequence", { leadId, sequenceId }, () => getAdapter().triggerSequence(leadId, sequenceId)),
  deleteLead: (leadId: string) => reliableWrite("deleteLead", { leadId }, () => getAdapter().deleteLead(leadId)),
  exportCSV: (...args: Parameters<CRMAdapter["exportCSV"]>) => getAdapter().exportCSV(...args),
};
