/**
 * DEMANDE DE DIAGNOSTIC — emails E3 (accusé au lead) et E4 (notification à
 * l'équipe), spec §5.1.
 *
 * Ces envois s'appelaient « confirmation d'inscription ». Le nom était faux :
 * dans ce tunnel, l'inscription EST le lead gate, déjà couvert par E1/E2. Le
 * clic sur « Valider ce chiffre — Diagnostic 30 min » est un acte différent
 * et plus fort : une demande de rendez-vous. E3/E4 signalent donc un lead
 * plus chaud, ils ne doublonnent pas E1/E2, et aucun lead n'est perdu si ce
 * clic n'a pas lieu.
 *
 * Comme /api/lead : envoi serveur uniquement, idempotent, non bloquant.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { crm, storageIsDurable } from "@/lib/crm";
import { dossierUrl } from "@/lib/dossier/token";
import { baseUrlFrom, buildServerPayload, coerceForm } from "@/lib/email/context";
import { sendDemandeDiagnostic } from "@/lib/email/send";
import { unsubscribeUrl } from "@/lib/email/unsubscribe";

export const runtime = "nodejs";

const payloadSchema = z.object({
  lead_id: z.string().optional(),
  simulation_id: z.string(),
  identity: z.object({
    first_name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  form: z.record(z.unknown()).optional(),
  source: z
    .object({
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
      utmContent: z.string().optional(),
      utmTerm: z.string().optional(),
      leadSource: z.string().optional(),
      device: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof payloadSchema>;
  try {
    parsed = payloadSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "invalid payload", details: String(err) }, { status: 400 });
  }

  const baseUrl = baseUrlFrom(req);
  const payload = buildServerPayload({
    form: coerceForm(parsed.form),
    identite: {
      prenom: parsed.identity.first_name,
      email: parsed.identity.email,
      telephone: parsed.identity.phone,
    },
    simulationId: parsed.simulation_id,
    baseUrl,
    source: parsed.source,
  });

  if (!payload) {
    console.error("[demande-diagnostic] récapitulatif non calculable", JSON.stringify({ simulationId: parsed.simulation_id }));
    return NextResponse.json({ ok: false, reason: "simulation incomplète" }, { status: 422 });
  }

  payload.meta.dossierUrl = dossierUrl(payload, baseUrl);

  let lienDesinscription: string | undefined;
  try {
    lienDesinscription = unsubscribeUrl(parsed.identity.email, baseUrl);
  } catch {
    lienDesinscription = undefined;
  }
  const report = await sendDemandeDiagnostic(payload, {
    unsubscribeUrl: lienDesinscription,
    alerteInterne: storageIsDurable() ? undefined : "CRM_PROVIDER=mock : ce lead n'est conservé nulle part côté serveur",
  });
  if (!report.lead.ok || (report.interne && !report.interne.ok)) {
    console.error(
      "[demande-diagnostic] envoi email partiel ou échoué",
      JSON.stringify({ simulationId: parsed.simulation_id, lead: report.lead, interne: report.interne }),
    );
  }

  // Journalise l'étape dans le CRM et ARRÊTE la séquence prospects. L'email
  // est passé explicitement : cette requête n'est pas celle qui a créé le
  // lead, le miroir en mémoire de l'adaptateur y est vide (piège repéré le 25/09).
  await crm
    .appendEvent(
      parsed.lead_id ?? `email:${parsed.identity.email}`,
      { event: "rdv_clicked", timestamp: new Date().toISOString() },
      parsed.identity.email,
    )
    .catch(() => undefined);

  return NextResponse.json({ ok: true, emailSent: report.lead.ok, dossierUrl: payload.meta.dossierUrl });
}
