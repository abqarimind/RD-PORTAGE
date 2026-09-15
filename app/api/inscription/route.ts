/**
 * Finalisation de l'inscription — emails E3 (confirmation au lead) et
 * E4 (notification de nouveau lead en interne), spec §5.1.
 *
 * Note de cadrage, à arbitrer côté produit : le tunnel déployé ne comporte
 * aujourd'hui qu'UN SEUL point de soumission (le lead gate du simulateur).
 * « Fin de simulation » et « finalisation de l'inscription » y sont donc le
 * même instant. Pour éviter d'envoyer quatre emails d'un coup, E3/E4 sont
 * déclenchés par l'engagement explicite qui suit le lead gate — le clic sur
 * « Valider ce chiffre / Diagnostic 30 min » — qui est le moment où le lead
 * devient commercialement actionnable. Le jour où une étape d'inscription
 * distincte existera, il suffira d'appeler cette route à ce moment-là.
 *
 * Comme /api/lead : envoi serveur uniquement, idempotent, non bloquant.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { crm } from "@/lib/crm";
import { dossierUrl } from "@/lib/dossier/token";
import { baseUrlFrom, buildServerPayload, coerceForm } from "@/lib/email/context";
import { sendInscription } from "@/lib/email/send";

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
    console.error("[inscription] récapitulatif non calculable", JSON.stringify({ simulationId: parsed.simulation_id }));
    return NextResponse.json({ ok: false, reason: "simulation incomplète" }, { status: 422 });
  }

  payload.meta.dossierUrl = dossierUrl(payload, baseUrl);

  const report = await sendInscription(payload);
  if (!report.lead.ok || (report.interne && !report.interne.ok)) {
    console.error(
      "[inscription] envoi email partiel ou échoué",
      JSON.stringify({ simulationId: parsed.simulation_id, lead: report.lead, interne: report.interne }),
    );
  }

  // Journalise l'étape dans le CRM quand le lead est déjà connu.
  if (parsed.lead_id) {
    await crm
      .appendEvent(parsed.lead_id, { event: "rdv_clicked", timestamp: new Date().toISOString() })
      .catch(() => undefined);
  }

  return NextResponse.json({ ok: true, emailSent: report.lead.ok, dossierUrl: payload.meta.dossierUrl });
}
