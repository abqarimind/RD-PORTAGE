/** Payload de référence pour les tests d'emails et de dossier. */
import { simulate } from "@/lib/fiscal/scenarios";
import { buildSimInput, computeLive } from "@/lib/simulateur/live";
import { buildPayload } from "@/lib/simulateur/payload";
import { DEFAULT_FORM, resolvedTjm, type FormState } from "@/lib/simulateur/state";
import type { Lead } from "@/lib/crm/schema";
import type { SimulationResultPayload } from "@/types/simulation-result";

export function makePayload(patch: Partial<FormState> = {}): SimulationResultPayload {
  // Le profil n'a plus de valeur par défaut (§4.3) : un parcours réel en
  // choisit toujours un, la fixture fait de même.
  const form: FormState = { ...DEFAULT_FORM, status: "freelance_micro", ...patch };
  const status = form.status ?? "freelance_micro";
  const tjm = resolvedTjm(form);
  const live = computeLive(form, tjm);
  const result = simulate(buildSimInput(form, tjm, status));

  return buildPayload(form, result, live, {
    identite: { prenom: "Camille", email: "camille@example.com", telephone: "0612345678" },
    simulationId: "sim-fixture-1",
    dateSimulation: "2026-09-15T10:00:00.000Z",
    baseUrl: "https://rd-portage.vercel.app",
  });
}

/** Lead de référence (Meta, annonce B_Foyer_s04), pour la notification interne. */
export function makeLead(patch: Partial<Lead> = {}): Lead {
  return {
    lead_id: "6f1b0a5e-3c2d-4b1a-9f8e-7d6c5b4a3210",
    schema_version: "lead_schema_v1",
    created_at: "2026-10-14T10:45:00.000Z",
    identity: { email: "camille@example.com", first_name: "Camille", phone: "+33612345678" },
    profile: {
      statut_actuel: "freelance_micro",
      tjm_ou_ca: 575,
      jours_factures: 20,
      foyer: { situation: "celibataire", enfants: 0, garde_alternee: 0 },
    },
    simulation: { inputs: {}, scenarios: [], economie_annuelle_eur: -14179, completed: true },
    consent: { marketing_optin: false, timestamp: "2026-10-14T10:45:00.000Z", policy_version: "privacy-2026-10", ip_hash: "abc" },
    attribution: {
      first_touch: {
        utm_source: "meta",
        utm_medium: "paid_social",
        utm_campaign: "RDP_Leads_10-2026",
        utm_content: "B_Foyer_s04",
        fbclid: "IwAR-test",
        landing_path: "/",
        timestamp: "2026-10-14T10:40:00.000Z",
      },
      last_touch: { timestamp: "2026-10-14T10:40:00.000Z" },
      lead_source: "froid_ads",
      device: "mobile",
    },
    funnel_stage: "consideration",
    funnel_events: [],
    journey: { angle: "lp_b", last_step: "inscription", summary: "Freelance · TJM 500 à 650 €" },
    ...patch,
  };
}
