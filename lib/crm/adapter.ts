/**
 * CRMAdapter — the only contract the funnel knows. The concrete destination
 * (Brevo, Airtable, Google Sheet, future custom CRM) is selected at runtime
 * via the CRM_PROVIDER env var; swapping providers must never touch funnel
 * code. See docs/bascule-crm.md.
 */
import type { FunnelEvent, Lead } from "./schema";

export interface ExportFilter {
  from?: string; // ISO date
  to?: string;
  funnelStage?: Lead["funnel_stage"];
}

export interface CRMAdapter {
  readonly name: string;
  /** Create or update a lead (idempotent on lead_id / email). */
  upsertLead(lead: Lead): Promise<void>;
  /** Append a funnel event to an existing lead. */
  appendEvent(leadId: string, event: FunnelEvent): Promise<void>;
  /** Trigger an email sequence (e.g. Brevo automation) for the lead. */
  triggerSequence(leadId: string, sequenceId: string): Promise<void>;
  /** GDPR right to erasure. */
  deleteLead(leadId: string): Promise<void>;
  /** CSV export compatible with Linda's current Excel workflow. */
  exportCSV(filter?: ExportFilter): Promise<string>;
}

/** Columns of the transition CSV — mirrors the partner Excel file. */
export const CSV_COLUMNS = [
  "lead_id",
  "created_at",
  "prenom",
  "email",
  "telephone",
  "statut_actuel",
  "tjm_ou_ca",
  "economie_annuelle_eur",
  "funnel_stage",
  "lead_source",
  "consentement_marketing",
] as const;

export function leadToCsvRow(lead: Lead): string {
  const cells = [
    lead.lead_id,
    lead.created_at,
    lead.identity.first_name,
    lead.identity.email,
    lead.identity.phone ?? "",
    lead.profile.statut_actuel,
    String(lead.profile.tjm_ou_ca),
    String(lead.simulation.economie_annuelle_eur),
    lead.funnel_stage,
    lead.attribution.lead_source,
    lead.consent.marketing_optin ? "oui" : "non",
  ];
  return cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";");
}

export function csvHeader(): string {
  return CSV_COLUMNS.join(";");
}
