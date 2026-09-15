/**
 * AirtableAdapter — leads in a "Leads" table, events in an "Events" table.
 * Requires env: AIRTABLE_API_KEY, AIRTABLE_BASE_ID, and optionally
 * AIRTABLE_LEADS_TABLE / AIRTABLE_EVENTS_TABLE (defaults below).
 * See docs/branchement-brevo-airtable.md for the expected base layout.
 */
import type { CRMAdapter, ExportFilter } from "./adapter";
import { csvHeader, leadToCsvRow } from "./adapter";
import { leadSchema, type FunnelEvent, type Lead } from "./schema";

const LEADS_TABLE = process.env.AIRTABLE_LEADS_TABLE ?? "Leads";
const EVENTS_TABLE = process.env.AIRTABLE_EVENTS_TABLE ?? "Events";

function base(): string {
  const id = process.env.AIRTABLE_BASE_ID;
  if (!id) throw new Error("AIRTABLE_BASE_ID is not set");
  return `https://api.airtable.com/v0/${id}`;
}

function headers() {
  const key = process.env.AIRTABLE_API_KEY;
  if (!key) throw new Error("AIRTABLE_API_KEY is not set");
  return { authorization: `Bearer ${key}`, "content-type": "application/json" };
}

async function call(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${base()}${path}`, { ...init, headers: headers() });
  if (!res.ok) throw new Error(`Airtable ${init.method ?? "GET"} ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function findRecordId(leadId: string): Promise<string | null> {
  const formula = encodeURIComponent(`{lead_id}="${leadId}"`);
  const data = await call(`/${encodeURIComponent(LEADS_TABLE)}?filterByFormula=${formula}&maxRecords=1`);
  return data.records?.[0]?.id ?? null;
}

function leadFields(lead: Lead) {
  return {
    lead_id: lead.lead_id,
    created_at: lead.created_at,
    prenom: lead.identity.first_name,
    email: lead.identity.email,
    telephone: lead.identity.phone ?? "",
    statut_actuel: lead.profile.statut_actuel,
    tjm_ou_ca: lead.profile.tjm_ou_ca,
    jours_factures: lead.profile.jours_factures,
    economie_annuelle_eur: lead.simulation.economie_annuelle_eur,
    funnel_stage: lead.funnel_stage,
    lead_source: lead.attribution.lead_source,
    device: lead.attribution.device,
    consentement_marketing: lead.consent.marketing_optin,
    consent_timestamp: lead.consent.timestamp,
    policy_version: lead.consent.policy_version,
    /** Full canonical payload, for audit and future CRM migration. */
    raw_json: JSON.stringify(lead),
  };
}

export const airtableAdapter: CRMAdapter = {
  name: "airtable",

  async upsertLead(lead: Lead) {
    const existing = await findRecordId(lead.lead_id);
    if (existing) {
      await call(`/${encodeURIComponent(LEADS_TABLE)}/${existing}`, {
        method: "PATCH",
        body: JSON.stringify({ fields: leadFields(lead), typecast: true }),
      });
    } else {
      await call(`/${encodeURIComponent(LEADS_TABLE)}`, {
        method: "POST",
        body: JSON.stringify({ records: [{ fields: leadFields(lead) }], typecast: true }),
      });
    }
  },

  async appendEvent(leadId: string, event: FunnelEvent) {
    await call(`/${encodeURIComponent(EVENTS_TABLE)}`, {
      method: "POST",
      body: JSON.stringify({
        records: [
          {
            fields: {
              lead_id: leadId,
              event: event.event,
              timestamp: event.timestamp,
              metadata: JSON.stringify(event.metadata ?? {}),
            },
          },
        ],
        typecast: true,
      }),
    });
  },

  async triggerSequence(leadId: string, sequenceId: string) {
    // Airtable has no native email automation: flag the lead so a Brevo (or
    // Make/Zapier) sync picks it up. Documented in docs/branchement-brevo-airtable.md.
    const existing = await findRecordId(leadId);
    if (!existing) throw new Error(`unknown lead ${leadId}`);
    await call(`/${encodeURIComponent(LEADS_TABLE)}/${existing}`, {
      method: "PATCH",
      body: JSON.stringify({ fields: { sequence_a_declencher: sequenceId }, typecast: true }),
    });
  },

  async deleteLead(leadId: string) {
    const existing = await findRecordId(leadId);
    if (existing) await call(`/${encodeURIComponent(LEADS_TABLE)}/${existing}`, { method: "DELETE" });
  },

  async exportCSV(filter?: ExportFilter) {
    // Airtable pagine par 100 : sans suivre `offset`, l'export s'arrêtait
    // silencieusement au centième lead. Une troncature invisible dans le
    // fichier de Linda est pire qu'une erreur.
    const rows: string[] = [];
    let offset: string | undefined;
    let pages = 0;
    do {
      const query = new URLSearchParams({ pageSize: "100" });
      if (offset) query.set("offset", offset);
      const data = await call(`/${encodeURIComponent(LEADS_TABLE)}?${query.toString()}`);
      for (const record of data.records ?? []) {
        try {
          const lead = leadSchema.parse(JSON.parse(record.fields.raw_json));
          if (filter?.funnelStage && lead.funnel_stage !== filter.funnelStage) continue;
          rows.push(leadToCsvRow(lead));
        } catch {
          // Ligne malformée ignorée plutôt que tout l'export en échec.
        }
      }
      offset = data.offset;
      pages += 1;
      // Garde-fou : 100 pages = 10 000 leads. Au-delà, on préfère un log
      // explicite à une boucle qui tournerait indéfiniment sur une réponse
      // inattendue.
      if (pages >= 100 && offset) {
        console.error("[crm-airtable] export interrompu après 10 000 lignes — pagination anormalement longue");
        break;
      }
    } while (offset);
    return [csvHeader(), ...rows].join("\n");
  },
};
