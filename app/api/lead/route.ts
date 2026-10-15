/**
 * Lead submission — server-side only (no CRM key ever reaches the client).
 * Validates lead_schema_v1 at the boundary, hashes the IP for the consent
 * register, writes through the reliable CRM queue, triggers the 14-day
 * sequence, and journals the lead_submitted event.
 *
 * Depuis le 14/10 :
 *  - le téléphone est OBLIGATOIRE, normalisé en E.164 ici (la validation du
 *    formulaire n'est qu'un confort) ;
 *  - anti-spam : champ piège (`website`) et limite de débit par IP ;
 *  - le récapitulatif E1 part au lead avant la réponse (l'écran annonce son
 *    envoi) ; l'écriture CRM et la notification interne « Nouveau lead
 *    simulateur » partent ENSUITE, en arrière-plan (waitUntil), avec leurs
 *    propres tentatives : elles ne retardent jamais la réponse au prospect.
 *
 * Le récapitulatif est RECALCULÉ ici à partir du formulaire : les montants
 * envoyés par le navigateur ne font jamais autorité. Aucun envoi d'email
 * n'est bloquant (§5.2).
 */
import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { crm, storageIsDurable } from "@/lib/crm";
import { leadSchema, type Lead } from "@/lib/crm/schema";
import { sendCapiEvent } from "@/lib/server/capi";
import { rateLimited } from "@/lib/server/rate-limit";
import { baseUrlFrom, buildServerPayload, coerceForm } from "@/lib/email/context";
import { sendNouveauLead, sendRecapLead } from "@/lib/email/send";
import { dossierUrl } from "@/lib/dossier/token";
import { unsubscribeUrl } from "@/lib/email/unsubscribe";
import { resumeSimulation } from "@/lib/lead/summary";
import { normalizePhone, PHONE_ERROR } from "@/lib/phone";
import type { SimulationResultPayload } from "@/types/simulation-result";

/** Lien de désinscription (#13) — jamais bloquant si la signature échoue. */
function lienDesinscription(email: string, baseUrl: string): string | undefined {
  try {
    return unsubscribeUrl(email, baseUrl);
  } catch (err) {
    console.error("[lead] lien de désinscription non signé", String(err));
    return undefined;
  }
}

export const runtime = "nodejs";

const SEQUENCE_ID = "seq14";

/**
 * 5 envois par IP et par tranche de 10 minutes : largement assez pour un
 * humain qui corrige une faute. LEAD_RATE_LIMIT_MAX ne sert qu'aux tests de
 * bout en bout, qui envoient plusieurs leads depuis la même adresse.
 */
const RATE_LIMIT = { max: Number(process.env.LEAD_RATE_LIMIT_MAX) || 5, windowMs: 10 * 60 * 1000 };

const payloadSchema = leadSchema
  .omit({ lead_id: true, created_at: true, schema_version: true, funnel_stage: true, funnel_events: true })
  .extend({
    // Téléphone obligatoire (décision du 14/10) ; son format est vérifié à part.
    identity: leadSchema.shape.identity.extend({ phone: z.string().min(1).max(40) }),
    consent: leadSchema.shape.consent.omit({ ip_hash: true }),
    // Optional: browser-generated Meta event_id so the CAPI Lead below
    // deduplicates against the Pixel Lead fired client-side.
    meta_event_id: z.string().optional(),
    // Consentement publicitaire donné dans la bannière cookies (≠ opt-in email).
    ad_consent: z.boolean().optional(),
    // Identifiant stable de la simulation — sert de clé d'idempotence email.
    simulation_id: z.string().optional(),
    // État complet du formulaire, pour recalculer le récapitulatif ici.
    form: z.record(z.unknown()).optional(),
  });

/** Champ piège : invisible pour un humain, rempli par les robots. */
const HONEYPOT = "website";

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  // Robot : on répond comme si tout allait bien, sans rien enregistrer ni envoyer.
  const piege = (raw as Record<string, unknown> | null)?.[HONEYPOT];
  if (typeof piege === "string" && piege.trim() !== "") {
    return NextResponse.json({ leadId: randomUUID(), emailSent: false });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 32);
  if (rateLimited(ipHash, RATE_LIMIT)) {
    return NextResponse.json(
      { error: "rate_limited", message: "Trop de demandes en peu de temps. Réessayez dans quelques minutes." },
      { status: 429 },
    );
  }

  let parsed: z.infer<typeof payloadSchema>;
  try {
    parsed = payloadSchema.parse(raw);
  } catch (err) {
    return NextResponse.json({ error: "invalid payload", details: String(err) }, { status: 400 });
  }

  const phone = normalizePhone(parsed.identity.phone);
  if (!phone) {
    return NextResponse.json({ error: "invalid_phone", message: PHONE_ERROR }, { status: 400 });
  }

  const now = new Date().toISOString();
  const lead: Lead = leadSchema.parse({
    ...parsed,
    identity: { ...parsed.identity, phone },
    lead_id: randomUUID(),
    schema_version: "lead_schema_v1",
    created_at: now,
    consent: { ...parsed.consent, ip_hash: ipHash },
    funnel_stage: "consideration",
    funnel_events: [{ event: "lead_submitted", timestamp: now }],
  });

  // Lead Meta côté serveur (API Conversions) — INACTIF tant que
  // META_CAPI_ENABLED !== "true" (docs/meta-capi.md). Ne part qu'avec le
  // consentement publicitaire de la bannière, sans email, téléphone ni
  // montant ; même event_id que le Pixel pour la déduplication.
  const metaEventId = parsed.meta_event_id ?? randomUUID();
  if (parsed.ad_consent === true) {
    void sendCapiEvent({
      eventName: "Lead",
      eventId: metaEventId,
      eventSourceUrl: req.headers.get("referer") ?? undefined,
      customData: { content_name: "simulateur_dossier" },
      userData: {
        fbp: req.cookies.get("_fbp")?.value,
        fbc: req.cookies.get("_fbc")?.value,
        clientIp: ip,
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    }).catch(() => {});
  }

  /* ————————————————— récapitulatif recalculé + E1 (§5.1) ————————————————— */
  const simulationId = parsed.simulation_id ?? lead.lead_id;
  const baseUrl = baseUrlFrom(req);
  const alertes: string[] = [];
  let payload: SimulationResultPayload | null = null;
  let dossierLink: string | undefined;
  let emailSent = false;

  try {
    payload = buildServerPayload({
      form: coerceForm(parsed.form),
      identite: { prenom: lead.identity.first_name, email: lead.identity.email, telephone: phone },
      simulationId,
      baseUrl,
      source: {
        utmSource: lead.attribution.first_touch.utm_source,
        utmMedium: lead.attribution.first_touch.utm_medium,
        utmCampaign: lead.attribution.first_touch.utm_campaign,
        utmContent: lead.attribution.first_touch.utm_content,
        utmTerm: lead.attribution.first_touch.utm_term,
        leadSource: lead.attribution.lead_source,
        device: lead.attribution.device,
      },
    });
  } catch (err) {
    console.error("[lead] échec de préparation du récapitulatif", JSON.stringify({ leadId: lead.lead_id, error: String(err) }));
  }

  if (payload) {
    lead.journey = { ...lead.journey, summary: resumeSimulation(payload) };
    /**
     * Le lien du dossier est signé et porte le récapitulatif : il reste
     * ouvrable depuis l'email, sur n'importe quel appareil, sans stockage.
     * Sa signature est isolée : DOSSIER_SECRET est bloquant en production,
     * et son absence ne doit pas supprimer l'email, seulement le dégrader.
     */
    try {
      dossierLink = dossierUrl(payload, baseUrl);
      payload.meta.dossierUrl = dossierLink;
    } catch (err) {
      alertes.push("le lien de dossier n'a pas pu être signé (DOSSIER_SECRET)");
      console.error("[lead] lien de dossier non signé — l'email part sans lien", JSON.stringify({ leadId: lead.lead_id, error: String(err) }));
    }
    const recap = await sendRecapLead(payload, { unsubscribeUrl: lienDesinscription(lead.identity.email, baseUrl) });
    emailSent = recap.ok;
    if (!recap.ok) console.error("[lead] récapitulatif non envoyé au lead", JSON.stringify({ leadId: lead.lead_id, error: recap.error }));
  } else {
    alertes.push("le récapitulatif n'a pas pu être calculé : aucun email n'est parti au prospect");
    console.error("[lead] récapitulatif non calculable — aucun email au lead", JSON.stringify({ leadId: lead.lead_id }));
  }

  // Enregistrement + notification interne, après la réponse.
  waitUntil(enregistrerEtNotifier(lead, payload, dossierLink, alertes));

  return NextResponse.json({ leadId: lead.lead_id, metaEventId, dossierUrl: dossierLink, emailSent });
}

/**
 * L'écriture CRM n'interrompt JAMAIS le parcours (la file ne lève pas), mais
 * un échec ou un enregistrement partiel ne doit pas rester silencieux : il
 * s'affiche dans la notification interne, avec les données brutes du lead
 * (§4.2). La notification part dans tous les cas.
 */
async function enregistrerEtNotifier(
  lead: Lead,
  payload: SimulationResultPayload | null,
  dossierLink: string | undefined,
  alertes: string[],
): Promise<void> {
  const written = await crm.upsertLead(lead);
  if (lead.consent.marketing_optin) {
    await crm.triggerSequence(lead.lead_id, SEQUENCE_ID, lead.identity.email);
  }
  if (!written.ok) alertes.push("l'écriture dans le CRM a échoué après plusieurs tentatives");
  if (written.ok && written.value && written.value.warnings) alertes.push(...written.value.warnings);
  if (!storageIsDurable()) alertes.push("CRM_PROVIDER=mock : ce lead n'est conservé nulle part côté serveur");
  if (alertes.length > 0) {
    console.error("[lead] lead enregistré avec alertes", JSON.stringify({ leadId: lead.lead_id, alertes }));
  }

  const notif = await sendNouveauLead({ lead, payload, dossierUrl: dossierLink, alertes });
  if (!notif?.ok) {
    console.error("[lead] notification interne NON envoyée", JSON.stringify({ leadId: lead.lead_id, error: notif?.error ?? "aucun destinataire" }));
    if (!written.ok) {
      // Dernier recours : ni CRM ni notification. Sans cette ligne, le lead
      // serait définitivement perdu ; les journaux Vercel le conservent.
      console.error("[lead] DERNIER RECOURS — lead perdu ailleurs, données complètes :", JSON.stringify(lead));
    }
  }
}
