/**
 * MockAdapter — default while no CRM credentials exist ("mockup" mode).
 * Persists everything to the NDJSON journal + an in-memory map, so the whole
 * funnel (capture, events, CSV export) is testable end-to-end without keys.
 */
import type { CRMAdapter, ExportFilter } from "./adapter";
import { csvHeader, leadToCsvRow } from "./adapter";
import type { FunnelEvent, Lead } from "./schema";

const store = new Map<string, Lead>();

export const mockAdapter: CRMAdapter = {
  name: "mock",

  async upsertLead(lead: Lead) {
    store.set(lead.lead_id, lead);
    console.info(`[crm-mock] upsertLead ${lead.lead_id} (${lead.identity.email})`);
  },

  async appendEvent(leadId: string, event: FunnelEvent) {
    const lead = store.get(leadId);
    if (lead) lead.funnel_events.push(event);
    console.info(`[crm-mock] appendEvent ${leadId} ${event.event}`);
  },

  async triggerSequence(leadId: string, sequenceId: string) {
    console.info(`[crm-mock] triggerSequence ${leadId} → ${sequenceId}`);
  },

  async deleteLead(leadId: string) {
    store.delete(leadId);
    console.info(`[crm-mock] deleteLead ${leadId}`);
  },

  async exportCSV(filter?: ExportFilter) {
    const rows = [...store.values()]
      .filter((l) => !filter?.funnelStage || l.funnel_stage === filter.funnelStage)
      .map(leadToCsvRow);
    return [csvHeader(), ...rows].join("\n");
  },
};
