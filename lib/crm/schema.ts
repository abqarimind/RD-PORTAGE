/**
 * lead_schema_v1 — canonical lead shape, validated with Zod at every
 * boundary (client → API route → CRM adapter). Version the schema (v2, ...)
 * instead of mutating it.
 */
import { z } from "zod";

export const LEAD_SCHEMA_VERSION = "lead_schema_v1";

/** Closed funnel-event taxonomy, mapped on the 3 acts. */
export const FUNNEL_EVENTS = [
  // ACTE 1 — INTÉRÊT
  "page_view",
  "diag_started",
  "diag_q1_answered",
  "diag_q2_answered",
  "diag_q3_answered",
  "diag_completed",
  // ACTE 2 — CONSIDÉRATION
  "sim_started",
  "sim_step_1_completed",
  "sim_step_2_completed",
  "sim_step_3_completed",
  "sim_completed",
  "email_gate_viewed",
  "lead_submitted",
  // ACTE 3 — DÉCISION
  "pdf_downloaded",
  "email_opened",
  "email_clicked",
  "rdv_clicked",
  "rdv_booked",
  "call_done", // entered manually in the CRM (see docs/procedure-linda.md)
  "signe", // entered manually in the CRM
] as const;

export const funnelEventSchema = z.object({
  event: z.enum(FUNNEL_EVENTS),
  timestamp: z.string().datetime(),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const touchSchema = z.object({
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
  referrer: z.string().optional(),
  landing_path: z.string().optional(),
  gclid: z.string().optional(),
  fbclid: z.string().optional(),
  timestamp: z.string().datetime(),
});

export const leadSchema = z.object({
  lead_id: z.string().uuid(),
  schema_version: z.literal(LEAD_SCHEMA_VERSION).default(LEAD_SCHEMA_VERSION),
  created_at: z.string().datetime(),
  identity: z.object({
    email: z.string().email(),
    first_name: z.string().min(1),
    phone: z.string().optional(),
  }),
  profile: z.object({
    statut_actuel: z.enum(["salarie_esn", "freelance_micro", "freelance_sasu", "porte_ailleurs", "transition"]),
    tjm_ou_ca: z.number().nonnegative(),
    jours_factures: z.number().nonnegative(),
    foyer: z.object({
      situation: z.enum(["celibataire", "marie_pacse"]),
      enfants: z.number().int().nonnegative(),
      garde_alternee: z.number().int().nonnegative(),
    }),
  }),
  simulation: z.object({
    inputs: z.record(z.unknown()),
    scenarios: z.array(z.record(z.unknown())),
    economie_annuelle_eur: z.number(),
    completed: z.boolean(),
  }),
  consent: z.object({
    marketing_optin: z.boolean(),
    timestamp: z.string().datetime(),
    policy_version: z.string(),
    ip_hash: z.string(),
  }),
  attribution: z.object({
    first_touch: touchSchema,
    last_touch: touchSchema,
    lead_source: z.enum([
      "froid_seo",
      "froid_ads",
      "froid_linkedin",
      "froid_youtube",
      "chaud_coldcall",
      "chaud_cooptation",
      "direct",
    ]),
    device: z.enum(["mobile", "desktop"]),
  }),
  funnel_stage: z.enum(["interet", "consideration", "decision", "signe", "perdu"]),
  funnel_events: z.array(funnelEventSchema),
});

export type Lead = z.infer<typeof leadSchema>;
export type FunnelEvent = z.infer<typeof funnelEventSchema>;
export type FunnelEventName = (typeof FUNNEL_EVENTS)[number];
