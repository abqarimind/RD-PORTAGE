/**
 * Lead submission — server-side only (no CRM key ever reaches the client).
 * Validates lead_schema_v1 at the boundary, hashes the IP for the consent
 * register, writes through the reliable CRM queue, triggers the 14-day
 * sequence, and journals the lead_submitted event.
 *
 * Envoie aussi les emails E1 (récapitulatif au lead) et E2 (copie interne),
 * spec §5.1. Le récapitulatif est RECALCULÉ ici à partir du formulaire : les
 * montants envoyés par le navigateur ne font jamais autorité.
 *
 * L'envoi d'email n'est jamais bloquant (§5.2) : un échec est journalisé et
 * signalé dans la réponse, mais le lead est enregistré et le dossier reste
 * accessible.
 */
import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { crm, storageIsDurable } from "@/lib/crm";
import { leadSchema, type Lead } from "@/lib/crm/schema";
import { sendCapiEvent } from "@/lib/server/capi";
import { baseUrlFrom, buildServerPayload, coerceForm } from "@/lib/email/context";
import { sendRecap } from "@/lib/email/send";
import { dossierUrl } from "@/lib/dossier/token";

export const runtime = "nodejs";

const SEQUENCE_ID = "seq14";

const payloadSchema = leadSchema
  .omit({ lead_id: true, created_at: true, schema_version: true, funnel_stage: true, funnel_events: true })
  .extend({
    consent: leadSchema.shape.consent.omit({ ip_hash: true }),
    // Optional: browser-generated Meta event_id so the CAPI Lead below
    // deduplicates against the Pixel Lead fired client-side.
    meta_event_id: z.string().optional(),
    // Identifiant stable de la simulation — sert de clé d'idempotence email.
    simulation_id: z.string().optional(),
    // État complet du formulaire, pour recalculer le récapitulatif ici.
    form: z.record(z.unknown()).optional(),
  });

export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof payloadSchema>;
  try {
    parsed = payloadSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "invalid payload", details: String(err) }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 32);
  const now = new Date().toISOString();

  const lead: Lead = leadSchema.parse({
    ...parsed,
    lead_id: randomUUID(),
    schema_version: "lead_schema_v1",
    created_at: now,
    consent: { ...parsed.consent, ip_hash: ipHash },
    funnel_stage: "consideration",
    funnel_events: [{ event: "lead_submitted", timestamp: now }],
  });

  /**
   * L'écriture CRM n'interrompt JAMAIS le parcours (la file ne lève pas),
   * mais un échec ne doit pas rester silencieux : il est journalisé ET
   * signalé dans l'email interne, avec les données brutes du lead, pour que
   * celui-ci reste récupérable à la main (§4.2).
   */
  const written = await crm.upsertLead(lead);
  if (lead.consent.marketing_optin) {
    await crm.triggerSequence(lead.lead_id, SEQUENCE_ID);
  }

  const alertes: string[] = [];
  if (!written.ok) alertes.push("l'écriture dans le CRM a échoué après plusieurs tentatives");
  if (!storageIsDurable()) alertes.push("CRM_PROVIDER=mock : ce lead n'est conservé nulle part côté serveur");
  if (alertes.length > 0) {
    console.error("[lead] lead non durablement enregistré", JSON.stringify({ leadId: lead.lead_id, alertes }));
  }

  // Server-side Meta CAPI Lead — fires only when marketing consent was given
  // (the Pixel is consent-gated too) and Meta keys are configured. The
  // event_id is shared with the browser Pixel Lead for deduplication.
  const metaEventId = parsed.meta_event_id ?? randomUUID();
  if (lead.consent.marketing_optin) {
    void sendCapiEvent({
      eventName: "Lead",
      eventId: metaEventId,
      eventSourceUrl: req.headers.get("referer") ?? undefined,
      customData: { value: lead.simulation.economie_annuelle_eur, currency: "EUR", content_name: "simulateur" },
      userData: {
        email: lead.identity.email,
        phone: lead.identity.phone,
        fbp: req.cookies.get("_fbp")?.value,
        fbc: req.cookies.get("_fbc")?.value,
        clientIp: ip,
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    }).catch(() => {});
  }

  /* ————————————————— emails E1 + E2 (§5.1) ————————————————— */
  const simulationId = parsed.simulation_id ?? lead.lead_id;
  const baseUrl = baseUrlFrom(req);
  let dossierLink: string | undefined;
  let emailSent = false;

  try {
    const payload = buildServerPayload({
      form: coerceForm(parsed.form),
      identite: {
        prenom: lead.identity.first_name,
        email: lead.identity.email,
        telephone: lead.identity.phone,
      },
      simulationId,
      baseUrl,
      source: {
        utmSource: lead.attribution?.first_touch?.utm_source,
        utmMedium: lead.attribution?.first_touch?.utm_medium,
        utmCampaign: lead.attribution?.first_touch?.utm_campaign,
        utmContent: lead.attribution?.first_touch?.utm_content,
        utmTerm: lead.attribution?.first_touch?.utm_term,
        leadSource: lead.attribution?.lead_source,
        device: lead.attribution?.device,
      },
    });

    if (payload) {
      // Le lien du dossier est signé et porte le récapitulatif : il reste
      // ouvrable depuis l'email, sur n'importe quel appareil, sans stockage.
      dossierLink = dossierUrl(payload, baseUrl);
      payload.meta.dossierUrl = dossierLink;

      const report = await sendRecap(payload, { alerteInterne: alertes[0] });
      emailSent = report.lead.ok;
      if (!report.lead.ok || (report.interne && !report.interne.ok)) {
        console.error(
          "[lead] envoi email partiel ou échoué",
          JSON.stringify({ leadId: lead.lead_id, lead: report.lead, interne: report.interne }),
        );
      }
    } else {
      console.error("[lead] récapitulatif non calculable — aucun email envoyé", JSON.stringify({ leadId: lead.lead_id }));
    }
  } catch (err) {
    // Non bloquant par construction : le lead est déjà enregistré.
    console.error("[lead] échec de préparation du récapitulatif", err);
  }

  return NextResponse.json({ leadId: lead.lead_id, metaEventId, dossierUrl: dossierLink, emailSent });
}
