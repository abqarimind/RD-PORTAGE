/**
 * BrevoAdapter — leads as Brevo contacts, sequences as Brevo automations
 * triggered by list membership. Requires env: BREVO_API_KEY,
 * BREVO_SEQ14_LIST_ID (list whose entry triggers the 14-day automation).
 * See docs/branchement-brevo-airtable.md.
 */
import type { CRMAdapter, ExportFilter } from "./adapter";
import { csvHeader, leadToCsvRow } from "./adapter";
import type { FunnelEvent, Lead } from "./schema";

const API = "https://api.brevo.com/v3";

function headers() {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error("BREVO_API_KEY is not set");
  return { "api-key": key, "content-type": "application/json", accept: "application/json" };
}

async function call(path: string, init: RequestInit): Promise<Response> {
  const res = await fetch(`${API}${path}`, { ...init, headers: headers() });
  // 400 "Contact already exist" on POST /contacts is handled by updateEnabled.
  if (!res.ok && res.status !== 204) {
    throw new Error(`Brevo ${init.method} ${path} → ${res.status}: ${await res.text()}`);
  }
  return res;
}

/** In-memory mirror for exportCSV (Brevo has no synchronous full export). */
const localMirror = new Map<string, Lead>();

export const brevoAdapter: CRMAdapter = {
  name: "brevo",

  async upsertLead(lead: Lead) {
    localMirror.set(lead.lead_id, lead);
    await call("/contacts", {
      method: "POST",
      body: JSON.stringify({
        email: lead.identity.email,
        updateEnabled: true,
        attributes: {
          PRENOM: lead.identity.first_name,
          SMS: lead.identity.phone,
          LEAD_ID: lead.lead_id,
          STATUT_ACTUEL: lead.profile.statut_actuel,
          TJM_OU_CA: lead.profile.tjm_ou_ca,
          ECONOMIE_ANNUELLE: lead.simulation.economie_annuelle_eur,
          SCENARIO_OPTIMAL: "portage_rd_optimise",
          FUNNEL_STAGE: lead.funnel_stage,
          LEAD_SOURCE: lead.attribution.lead_source,
          CONSENT_TS: lead.consent.timestamp,
          POLICY_VERSION: lead.consent.policy_version,
        },
      }),
    });
  },

  async appendEvent(leadId: string, event: FunnelEvent) {
    const lead = localMirror.get(leadId);
    if (!lead) return; // event tracking is best-effort on Brevo side
    await call(`/contacts/${encodeURIComponent(lead.identity.email)}`, {
      method: "PUT",
      body: JSON.stringify({
        attributes: { LAST_EVENT: event.event, LAST_EVENT_AT: event.timestamp },
      }),
    });
  },

  async triggerSequence(leadId: string, _sequenceId: string) {
    const lead = localMirror.get(leadId);
    if (!lead) throw new Error(`unknown lead ${leadId}`);
    const listId = Number(process.env.BREVO_SEQ14_LIST_ID);
    if (!listId) throw new Error("BREVO_SEQ14_LIST_ID is not set");
    await call(`/contacts/lists/${listId}/contacts/add`, {
      method: "POST",
      body: JSON.stringify({ emails: [lead.identity.email] }),
    });
  },

  async deleteLead(leadId: string) {
    const lead = localMirror.get(leadId);
    if (!lead) return;
    await call(`/contacts/${encodeURIComponent(lead.identity.email)}`, { method: "DELETE" });
    localMirror.delete(leadId);
  },

  async exportCSV(_filter?: ExportFilter) {
    const rows = [...localMirror.values()].map(leadToCsvRow);
    return [csvHeader(), ...rows].join("\n");
  },
};
