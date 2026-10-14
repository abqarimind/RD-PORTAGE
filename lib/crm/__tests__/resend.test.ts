/**
 * Stockage des contacts dans Resend.
 *
 * Ce qui est verrouillé ici, ce sont les deux points où la documentation qui
 * circule induit en erreur : les contacts sont GLOBAUX (plus d'`audienceId`),
 * et une séquence se déclenche sur un ÉVÉNEMENT NOMMÉ, pas en poussant le
 * contact dans une liste. Plus la garantie qui compte pour le client : un
 * lead déjà connu est mis à jour, jamais perdu.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Lead } from "@/lib/crm/schema";

const appels: { methode: string; payload: unknown }[] = [];
let echecCreate: { message: string } | null = null;
/** Propriétés déclarées dans le compte Resend simulé ; null = toutes. */
let declarees: string[] | null = null;
/** La liste des propriétés ne répond pas. */
let listeEnPanne = false;
const erreurPropriete = { name: "validation_error", message: "One or more properties do not exist" };

const trace = (methode: string, retour: unknown = { data: { id: "c_1" }, error: null }) => async (payload: unknown) => {
  appels.push({ methode, payload });
  return retour;
};

function proprietesInconnues(payload: unknown): boolean {
  if (declarees === null) return false;
  const props = (payload as { properties?: Record<string, unknown> }).properties ?? {};
  return Object.keys(props).some((k) => !declarees!.includes(k));
}

vi.mock("resend", () => ({
  Resend: class {
    contacts = {
      create: async (payload: unknown) => {
        appels.push({ methode: "contacts.create", payload });
        if (proprietesInconnues(payload)) return { data: null, error: erreurPropriete };
        return echecCreate ? { data: null, error: echecCreate } : { data: { id: "c_1" }, error: null };
      },
      update: async (payload: unknown) => {
        appels.push({ methode: "contacts.update", payload });
        if (proprietesInconnues(payload)) return { data: null, error: erreurPropriete };
        return { data: { id: "c_1" }, error: null };
      },
      remove: trace("contacts.remove"),
      get: trace("contacts.get"),
      list: trace("contacts.list", { data: { object: "list", data: [], has_more: false }, error: null }),
      segments: { add: trace("contacts.segments.add") },
    };
    events = { send: trace("events.send", { data: { object: "event", event: "x" }, error: null }) };
    contactProperties = {
      // Paginée comme l'API : 20 par défaut, curseur `after` sur l'id.
      list: async (options?: { limit?: number; after?: string }) => {
        if (listeEnPanne) return { data: null, error: { name: "application_error", message: "down" } };
        const toutes = (declarees ?? []).map((key, i) => ({ id: `p_${i}`, key }));
        const debut = options?.after ? toutes.findIndex((p) => p.id === options.after) + 1 : 0;
        const limite = options?.limit ?? 20;
        const page = toutes.slice(debut, debut + limite);
        return { data: { object: "list", has_more: debut + limite < toutes.length, data: page }, error: null };
      },
    };
  },
}));

const lead: Lead = {
  lead_id: "6f1b0a5e-3c2d-4b1a-9f8e-7d6c5b4a3210",
  schema_version: "lead_schema_v1",
  created_at: "2026-09-15T10:00:00.000Z",
  identity: { email: "camille@example.com", first_name: "Camille", phone: "+33600000000" },
  profile: {
    statut_actuel: "freelance_sasu",
    tjm_ou_ca: 420,
    jours_factures: 20,
    foyer: { situation: "celibataire", enfants: 0, garde_alternee: 0 },
  },
  simulation: { inputs: {}, scenarios: [], economie_annuelle_eur: 7400, completed: true },
  consent: {
    marketing_optin: true,
    timestamp: "2026-09-15T10:00:00.000Z",
    policy_version: "v1",
    ip_hash: "abc",
  },
  attribution: {
    first_touch: { timestamp: "2026-09-15T09:00:00.000Z" },
    last_touch: { timestamp: "2026-09-15T10:00:00.000Z" },
    lead_source: "froid_ads",
    device: "mobile",
  },
  funnel_stage: "consideration",
  funnel_events: [],
};

process.env.RESEND_API_KEY = "re_test";
const { resendAdapter } = await import("@/lib/crm/resend");

beforeEach(() => {
  appels.length = 0;
  echecCreate = null;
  declarees = null;
  listeEnPanne = false;
  delete process.env.RESEND_SEGMENT_LEADS_ID;
});

describe("upsertLead", () => {
  it("crée un contact global, sans audienceId", async () => {
    await resendAdapter.upsertLead(lead);
    const create = appels.find((a) => a.methode === "contacts.create");
    expect(create).toBeDefined();
    const payload = create!.payload as Record<string, unknown>;
    expect(payload.email).toBe("camille@example.com");
    expect(payload.firstName).toBe("Camille");
    // Régression : `audienceId` est déprécié depuis la bascule vers les
    // segments. L'envoyer ferait basculer le SDK sur la surcharge héritée.
    expect(payload).not.toHaveProperty("audienceId");
  });

  it("garde les montants en nombres, pas en chaînes", async () => {
    await resendAdapter.upsertLead(lead);
    const props = (appels[0].payload as { properties: Record<string, unknown> }).properties;
    expect(props.tjm_ou_ca).toBe(420);
    expect(props.economie_annuelle_eur).toBe(7400);
    expect(props.lead_id).toBe(lead.lead_id);
  });

  it("aligne l'abonnement marketing sur le consentement", async () => {
    await resendAdapter.upsertLead(lead);
    expect((appels[0].payload as { unsubscribed: boolean }).unsubscribed).toBe(false);

    appels.length = 0;
    await resendAdapter.upsertLead({ ...lead, consent: { ...lead.consent, marketing_optin: false } });
    expect((appels[0].payload as { unsubscribed: boolean }).unsubscribed).toBe(true);
  });

  it("met à jour au lieu d'échouer quand l'adresse est déjà connue", async () => {
    // Les contacts étant globaux, une adresse déjà présente fait échouer la
    // création. C'est le cas normal d'un lead qui refait une simulation : il
    // ne doit pas être perdu.
    echecCreate = { message: "Contact already exists" };
    await resendAdapter.upsertLead(lead);
    expect(appels.map((a) => a.methode)).toEqual(["contacts.create", "contacts.update"]);
  });

  it("range dans le segment quand il est configuré", async () => {
    process.env.RESEND_SEGMENT_LEADS_ID = "seg_123";
    await resendAdapter.upsertLead(lead);
    expect((appels[0].payload as { segments: { id: string }[] }).segments).toEqual([{ id: "seg_123" }]);
  });
});

describe("propriétés de contact (14/10)", () => {
  const avecSource: Lead = {
    ...lead,
    attribution: {
      ...lead.attribution,
      first_touch: {
        utm_source: "meta",
        utm_medium: "paid_social",
        utm_campaign: "RDP_Leads",
        utm_content: "B_Foyer_s04",
        fbclid: "IwAR-x",
        timestamp: "2026-10-14T09:00:00.000Z",
      },
    },
    journey: { angle: "lp_b", last_step: "inscription", summary: "Freelance · TJM 500 à 650 €" },
  };

  it("enregistre le téléphone et la source complète", async () => {
    await resendAdapter.upsertLead(avecSource);
    const props = (appels[0].payload as { properties: Record<string, unknown> }).properties;
    expect(props).toMatchObject({
      telephone: "+33600000000",
      utm_source: "meta",
      utm_medium: "paid_social",
      utm_campaign: "RDP_Leads",
      utm_content: "B_Foyer_s04",
      fbclid_present: "oui",
      angle: "lp_b",
      derniere_etape: "inscription",
      appareil: "mobile",
      resume_simulation: "Freelance · TJM 500 à 650 €",
    });
    // La valeur du fbclid elle-même ne sert à rien à l'équipe : elle n'est pas stockée.
    expect(JSON.stringify(props)).not.toContain("IwAR-x");
  });

  it("n'utilise que des clés de la liste déclarée (sinon Resend refuse tout le contact)", async () => {
    const { RESEND_CONTACT_PROPERTIES } = await import("@/lib/crm/resend");
    await resendAdapter.upsertLead(avecSource);
    const props = (appels[0].payload as { properties: Record<string, unknown> }).properties;
    for (const key of Object.keys(props)) expect(RESEND_CONTACT_PROPERTIES).toHaveProperty(key);
  });

  it("propriétés absentes de Resend : le contact est enregistré avec celles qui existent, et c'est signalé", async () => {
    declarees = ["lead_id", "telephone"];
    const issue = await resendAdapter.upsertLead(avecSource);
    const creations = appels.filter((a) => a.methode === "contacts.create");
    expect(creations).toHaveLength(2);
    expect((creations[1].payload as { properties: Record<string, unknown> }).properties).toEqual({
      lead_id: avecSource.lead_id,
      telephone: "+33600000000",
    });
    expect(issue && issue.warnings?.[0]).toMatch(/utm_content/);
    expect(issue && issue.warnings?.[0]).not.toMatch(/\btelephone\b/);
  });

  it("une seule propriété manquante ne fait plus perdre le téléphone ni la source (cas du 14/10)", async () => {
    const { RESEND_CONTACT_PROPERTIES } = await import("@/lib/crm/resend");
    // 24 propriétés sur 25 : plus que la page par défaut de l'API (20).
    declarees = Object.keys(RESEND_CONTACT_PROPERTIES).filter((k) => k !== "lead_created_at");
    const issue = await resendAdapter.upsertLead(avecSource);
    const derniere = appels.filter((a) => a.methode === "contacts.create").at(-1)!;
    const props = (derniere.payload as { properties: Record<string, unknown> }).properties;
    expect(props).toMatchObject({ telephone: "+33600000000", utm_content: "B_Foyer_s04", resume_simulation: "Freelance · TJM 500 à 650 €" });
    expect(props).not.toHaveProperty("lead_created_at");
    expect(issue && issue.warnings?.[0]).toMatch(/: lead_created_at\./);
  });

  it("liste des propriétés illisible : le contact est enregistré sans propriétés plutôt que perdu", async () => {
    declarees = ["lead_id"];
    listeEnPanne = true;
    const issue = await resendAdapter.upsertLead(avecSource);
    const sansProps = appels.find((a) => a.methode === "contacts.create" && !(a.payload as { properties?: unknown }).properties);
    expect(sansProps).toBeDefined();
    expect(issue && issue.warnings?.[0]).toMatch(/sans téléphone ni source/);
  });

  it("aucune clé ne reprend un champ natif du contact (Resend refuse de créer la propriété)", async () => {
    const { RESEND_CONTACT_PROPERTIES } = await import("@/lib/crm/resend");
    for (const reserve of ["id", "email", "first_name", "last_name", "unsubscribed", "created_at", "updated_at"]) {
      expect(RESEND_CONTACT_PROPERTIES).not.toHaveProperty(reserve);
    }
  });
});

describe("séquence", () => {
  it("se déclenche par un événement nommé, pas par une entrée de segment", async () => {
    await resendAdapter.upsertLead(lead);
    appels.length = 0;
    await resendAdapter.triggerSequence(lead.lead_id, "sequence_j14");
    expect(appels).toHaveLength(1);
    expect(appels[0].methode).toBe("events.send");
    expect(appels[0].payload).toEqual({ event: "sequence_j14", email: "camille@example.com" });
  });
});

describe("RGPD", () => {
  it("supprime le contact par son adresse", async () => {
    await resendAdapter.upsertLead(lead);
    appels.length = 0;
    await resendAdapter.deleteLead(lead.lead_id);
    expect(appels[0].methode).toBe("contacts.remove");
    expect(appels[0].payload).toEqual({ email: "camille@example.com" });
  });
});

describe("configuration", () => {
  it("lève sans clé API au lieu de perdre le lead en silence", async () => {
    const memoire = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    vi.resetModules();
    const { resendAdapter: frais } = await import("@/lib/crm/resend");
    await expect(frais.upsertLead(lead)).rejects.toThrow(/RESEND_API_KEY/);
    process.env.RESEND_API_KEY = memoire;
  });
});
