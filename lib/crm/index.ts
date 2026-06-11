/**
 * CRM facade used by the app. Provider chosen via CRM_PROVIDER
 * (mock | brevo | airtable | google-sheet | custom), default mock.
 * Every write goes through the reliable queue (journal + 3 retries).
 */
import type { CRMAdapter } from "./adapter";
import { airtableAdapter } from "./airtable";
import { brevoAdapter } from "./brevo";
import { mockAdapter } from "./mock";
import { reliableWrite } from "./queue";
import type { FunnelEvent, Lead } from "./schema";
import { customCrmAdapter, googleSheetAdapter } from "./stubs";

const ADAPTERS: Record<string, CRMAdapter> = {
  mock: mockAdapter,
  brevo: brevoAdapter,
  airtable: airtableAdapter,
  "google-sheet": googleSheetAdapter,
  custom: customCrmAdapter,
};

export function getAdapter(): CRMAdapter {
  const provider = process.env.CRM_PROVIDER ?? "mock";
  const adapter = ADAPTERS[provider];
  if (!adapter) throw new Error(`Unknown CRM_PROVIDER "${provider}"`);
  return adapter;
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
