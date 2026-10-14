/**
 * ResendAdapter — les leads deviennent des contacts Resend.
 *
 * Pourquoi Resend plutôt qu'un CRM de plus : le compte existe déjà pour le
 * transactionnel, donc brancher le stockage ici ne demande ni nouvel outil,
 * ni nouvelle facture, ni nouveau mot de passe à faire circuler.
 *
 * Deux points de l'API valent d'être posés noir sur blanc, parce qu'ils
 * contredisent la documentation qui circule encore :
 *
 *  1. LES AUDIENCES SONT DEVENUES DES SEGMENTS. Les contacts sont désormais
 *     globaux au compte : une même adresse est UN contact, qu'elle appartienne
 *     à zéro, un ou plusieurs segments. `audienceId` est marqué déprécié dans
 *     le SDK (v6) et n'est plus requis pour créer un contact. On ne s'en sert
 *     donc pas ; l'appartenance à un segment est posée séparément.
 *     https://resend.com/docs/dashboard/segments/migrating-from-audiences-to-segments
 *
 *  2. UNE AUTOMATION SE DÉCLENCHE SUR UN ÉVÉNEMENT NOMMÉ, pas sur l'entrée
 *     dans une liste (le pas de déclenchement porte un `eventName`). La
 *     séquence J0→J14 se lance donc via `events.send`, pas en poussant le
 *     contact dans un segment. C'est l'inverse du branchement Brevo.
 *
 * Variables d'environnement :
 *   RESEND_API_KEY            (obligatoire, déjà utilisée par le transactionnel)
 *   RESEND_SEGMENT_LEADS_ID   (optionnel) segment où ranger tous les leads
 *   RESEND_SEQUENCE_EVENT     (optionnel) nom d'événement par défaut de la séquence
 */
import { Resend } from "resend";
import type { CRMAdapter, ExportFilter } from "./adapter";
import { CSV_COLUMNS, csvHeader } from "./adapter";
import type { FunnelEvent, Lead } from "./schema";

let client: Resend | null = null;
function getClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  // On lève plutôt que de renvoyer null : la file d'écriture journalise et
  // réessaie, alors qu'un no-op silencieux perdrait le lead pour de bon.
  if (!key) throw new Error("RESEND_API_KEY n'est pas défini (CRM_PROVIDER=resend)");
  if (!client) client = new Resend(key);
  return client;
}

const segmentLeads = () => process.env.RESEND_SEGMENT_LEADS_ID || null;

/**
 * Propriétés personnalisées du contact — LISTE FERMÉE.
 *
 * Resend refuse tout le contact (« One or more properties do not exist ») dès
 * qu'une seule clé n'a pas été déclarée au préalable dans Paramètres →
 * Contacts → Propriétés. C'est ce qui a fait échouer chaque lead de
 * production jusqu'au 14/10. Cette liste est la source unique : à recopier
 * telle quelle dans Resend (clé + type), voir docs/schema-lead.md.
 *
 * Valeurs : `string | number | null` ; les montants restent des nombres,
 * filtrables tels quels dans un segment.
 */
export const RESEND_CONTACT_PROPERTIES = {
  lead_id: "string",
  created_at: "string",
  telephone: "string",
  statut_actuel: "string",
  tjm_ou_ca: "number",
  jours_factures: "number",
  economie_annuelle_eur: "number",
  // Variable de l'email J14 de la séquence (« environ X € laissés chaque mois »).
  economie_mensuelle: "number",
  // Condition d'arrêt de la séquence : « oui » dès que le prospect demande
  // son Diagnostic (automatique), répond ou est joint (à la main).
  sequence_stop: "string",
  funnel_stage: "string",
  lead_source: "string",
  consentement_marketing: "string",
  consent_ts: "string",
  policy_version: "string",
  // Source complète (14/10) : sans elles, impossible de savoir de quelle pub vient un lead.
  utm_source: "string",
  utm_medium: "string",
  utm_campaign: "string",
  utm_content: "string",
  fbclid_present: "string",
  angle: "string",
  derniere_etape: "string",
  appareil: "string",
  resume_simulation: "string",
  // Posées par appendEvent.
  last_event: "string",
  last_event_at: "string",
} as const;

export type ResendPropertyKey = keyof typeof RESEND_CONTACT_PROPERTIES;

export function proprietes(lead: Lead): Partial<Record<ResendPropertyKey, string | number | null>> {
  const first = lead.attribution.first_touch;
  return {
    lead_id: lead.lead_id,
    created_at: lead.created_at,
    telephone: lead.identity.phone ?? null,
    statut_actuel: lead.profile.statut_actuel,
    tjm_ou_ca: lead.profile.tjm_ou_ca,
    jours_factures: lead.profile.jours_factures,
    economie_annuelle_eur: lead.simulation.economie_annuelle_eur,
    economie_mensuelle: Math.round(lead.simulation.economie_annuelle_eur / 12),
    sequence_stop: "non",
    funnel_stage: lead.funnel_stage,
    lead_source: lead.attribution.lead_source,
    consentement_marketing: lead.consent.marketing_optin ? "oui" : "non",
    consent_ts: lead.consent.timestamp,
    policy_version: lead.consent.policy_version,
    utm_source: first.utm_source ?? null,
    utm_medium: first.utm_medium ?? null,
    utm_campaign: first.utm_campaign ?? null,
    utm_content: first.utm_content ?? null,
    // La présence seule : la valeur du fbclid n'a aucune utilité pour l'équipe.
    fbclid_present: first.fbclid || lead.attribution.last_touch.fbclid ? "oui" : "non",
    angle: lead.journey?.angle ?? null,
    derniere_etape: lead.journey?.last_step ?? null,
    appareil: lead.attribution.device,
    resume_simulation: lead.journey?.summary ?? null,
  };
}

/** Erreur Resend due à une propriété non déclarée dans le tableau de bord. */
const erreurDePropriete = (error: unknown) => /propert/i.test(messageErreur(error));

/**
 * Miroir leadId → email, pour les appels qui ne portent que l'identifiant.
 *
 * Même limite que l'adaptateur Brevo, et elle est assumée : en serverless ce
 * cache est vide d'une invocation à l'autre. `upsertLead` (le chemin
 * critique, qui porte l'email) n'en dépend PAS. Seuls les événements de
 * parcours peuvent être manqués, et ils sont déjà journalisés par ailleurs.
 */
const emailParLeadId = new Map<string, string>();

/**
 * Événements qui arrêtent la séquence prospects (voir content/emails/sequence.md).
 * `rdv_clicked` = demande de Diagnostic ; `call_done` = prospect joint.
 */
const ARRETS_SEQUENCE = new Set<FunnelEvent["event"]>(["rdv_clicked", "rdv_booked", "call_done", "signe"]);

/** Le SDK renvoie { data, error } au lieu de lever : on normalise. */
function messageErreur(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  const e = error as { message?: string; name?: string };
  return e.message ?? e.name ?? JSON.stringify(error);
}

/** Clés attendues absentes du compte Resend (best effort : liste vide si l'API ne répond pas). */
async function proprietesManquantes(): Promise<string[]> {
  try {
    const res = await getClient().contactProperties.list();
    const existantes = new Set((res.data?.data ?? []).map((p: { key: string }) => p.key));
    return Object.keys(RESEND_CONTACT_PROPERTIES).filter((k) => !existantes.has(k));
  } catch {
    return [];
  }
}

async function rangerDansLeSegment(email: string): Promise<void> {
  const segmentId = segmentLeads();
  if (!segmentId) return;
  const res = await getClient().contacts.segments.add({ email, segmentId });
  if (res.error) {
    // Un contact déjà dans le segment ne doit pas faire échouer l'upsert :
    // le lead est enregistré, c'est ce qui compte.
    console.warn("[crm-resend] segment non appliqué :", messageErreur(res.error));
  }
}

export const resendAdapter: CRMAdapter = {
  name: "resend",

  async upsertLead(lead: Lead) {
    const resend = getClient();
    const email = lead.identity.email;
    emailParLeadId.set(lead.lead_id, email);

    const base = {
      email,
      firstName: lead.identity.first_name,
      // RGPD : le récapitulatif transactionnel part de toute façon (il a été
      // demandé), mais le contact n'est démarchable que s'il a coché la case.
      unsubscribed: !lead.consent.marketing_optin,
    };
    const avecProprietes = { ...base, properties: proprietes(lead) };
    const segments = segmentLeads() ? { segments: [{ id: segmentLeads() as string }] } : {};

    /**
     * Les contacts étant globaux, une adresse déjà connue fait échouer la
     * création : on met alors à jour (cas normal d'un lead qui refait une
     * simulation). Renvoie l'erreur restante, ou null.
     */
    const ecrire = async (payload: typeof base & { properties?: ReturnType<typeof proprietes> }) => {
      const cree = await resend.contacts.create({ ...payload, ...segments });
      if (!cree.error) return null;
      if (erreurDePropriete(cree.error)) return cree.error;
      const maj = await resend.contacts.update(payload);
      if (!maj.error) {
        await rangerDansLeSegment(email);
        return null;
      }
      return erreurDePropriete(maj.error) ? maj.error : new Error(
        `Resend upsertLead a échoué — création : ${messageErreur(cree.error)} ; mise à jour : ${messageErreur(maj.error)}`,
      );
    };

    const erreur = await ecrire(avecProprietes);
    if (!erreur) return;
    if (!erreurDePropriete(erreur)) throw erreur;

    /**
     * Propriétés non déclarées dans Resend : plutôt que de perdre le contact,
     * on l'enregistre sans elles et on le SIGNALE. L'avertissement remonte
     * dans la notification interne, qui porte alors les données complètes.
     */
    const repli = await ecrire(base);
    if (repli) throw new Error(`Resend upsertLead a échoué, même sans propriétés : ${messageErreur(repli)}`);
    const manquantes = await proprietesManquantes();
    const detail = manquantes.length > 0 ? ` : ${manquantes.join(", ")}` : "";
    console.error(`[crm-resend] contact enregistré SANS ses propriétés — propriétés à créer dans Resend${detail}`);
    return {
      warnings: [
        `Resend : contact enregistré sans téléphone ni source, des propriétés n'existent pas dans Resend${detail}. ` +
          "Les créer dans Resend → Contacts → Propriétés (liste dans docs/schema-lead.md).",
      ],
    };
  },

  async appendEvent(leadId: string, event: FunnelEvent, emailConnu?: string) {
    // L'email passé par l'appelant prime : le miroir est vide d'une
    // invocation serverless à l'autre, et c'était précisément le cas de la
    // demande de Diagnostic — la mise à jour ne partait jamais, sans erreur.
    const email = emailConnu ?? emailParLeadId.get(leadId);
    if (!email) {
      console.warn("[crm-resend] appendEvent ignoré : email inconnu", JSON.stringify({ leadId, event: event.event }));
      return;
    }
    const res = await getClient().contacts.update({
      email,
      properties: {
        last_event: event.event,
        last_event_at: event.timestamp,
        ...(ARRETS_SEQUENCE.has(event.event) ? { sequence_stop: "oui" } : {}),
      },
    });
    if (res.error) throw new Error(`Resend appendEvent → ${messageErreur(res.error)}`);
  },

  async triggerSequence(leadId: string, _sequenceId: string, emailConnu?: string) {
    const email = emailConnu ?? emailParLeadId.get(leadId);
    if (!email) return;
    // La variable d'environnement prime : l'identifiant générique passé par
    // la route (« seq14 ») l'écrasait, et l'Automation n'aurait jamais reçu
    // l'événement qu'elle attend.
    const nomEvenement = process.env.RESEND_SEQUENCE_EVENT || "sequence_j14";
    // Déclenchement par ÉVÉNEMENT NOMMÉ : c'est ce qu'attend le pas de
    // déclenchement d'une Automation Resend.
    const res = await getClient().events.send({ event: nomEvenement, email });
    if (res.error) throw new Error(`Resend triggerSequence → ${messageErreur(res.error)}`);
  },

  async unsubscribe(email: string) {
    const res = await getClient().contacts.update({ email, unsubscribed: true, properties: { sequence_stop: "oui" } });
    if (res.error) throw new Error(`Resend unsubscribe → ${messageErreur(res.error)}`);
  },

  async deleteLead(leadId: string) {
    const email = emailParLeadId.get(leadId);
    if (!email) return;
    const res = await getClient().contacts.remove({ email });
    if (res.error) throw new Error(`Resend deleteLead → ${messageErreur(res.error)}`);
    emailParLeadId.delete(leadId);
  },

  async exportCSV(filter?: ExportFilter) {
    const resend = getClient();
    const segmentId = segmentLeads();
    const lignes: string[] = [];
    let after: string | undefined;
    let vus = 0;

    // `contacts.list` ne renvoie PAS les propriétés personnalisées (voir
    // l'interface Contact du SDK) : il faut un `get` par contact. D'où le
    // plafond explicite plutôt qu'un export qui partirait en vrille.
    const PLAFOND = 2_000;

    for (;;) {
      const page = await resend.contacts.list({ limit: 100, ...(after ? { after } : {}), ...(segmentId ? { segmentId } : {}) });
      if (page.error) throw new Error(`Resend exportCSV → ${messageErreur(page.error)}`);
      const contacts = page.data?.data ?? [];
      if (contacts.length === 0) break;

      for (const contact of contacts) {
        if (vus >= PLAFOND) {
          console.error(`[crm-resend] export interrompu à ${PLAFOND} contacts — passer par un export du tableau de bord`);
          return [csvHeader(), ...lignes].join("\n");
        }
        vus += 1;

        const detail = await resend.contacts.get({ id: contact.id });
        if (detail.error || !detail.data) continue; // une ligne illisible n'annule pas l'export
        const props = detail.data.properties ?? {};
        const val = (cle: string) => {
          const p = props[cle];
          return p === undefined ? "" : String(p.value);
        };

        if (filter?.funnelStage && val("funnel_stage") !== filter.funnelStage) continue;
        const cree = val("created_at") || detail.data.created_at;
        if (filter?.from && cree < filter.from) continue;
        if (filter?.to && cree > filter.to) continue;

        const cellules: Record<(typeof CSV_COLUMNS)[number], string> = {
          lead_id: val("lead_id"),
          created_at: cree,
          prenom: detail.data.first_name ?? "",
          email: detail.data.email,
          telephone: val("telephone"),
          statut_actuel: val("statut_actuel"),
          tjm_ou_ca: val("tjm_ou_ca"),
          economie_annuelle_eur: val("economie_annuelle_eur"),
          funnel_stage: val("funnel_stage"),
          lead_source: val("lead_source"),
          consentement_marketing: val("consentement_marketing"),
        };
        lignes.push(CSV_COLUMNS.map((c) => `"${cellules[c].replace(/"/g, '""')}"`).join(";"));
      }

      if (!page.data?.has_more) break;
      after = contacts[contacts.length - 1].id;
    }

    return [csvHeader(), ...lignes].join("\n");
  },
};
