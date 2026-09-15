/**
 * Fabrication du payload de récapitulatif côté serveur.
 *
 * Le serveur RECALCULE la simulation à partir du formulaire transmis plutôt
 * que de reprendre les montants envoyés par le navigateur : c'est le seul
 * moyen de garantir que l'email, le dossier et l'écran affichent les mêmes
 * chiffres, et que ces chiffres sortent bien du moteur fiscal.
 */
import { CAGNOTTE_PROVIDERS, cagnotteNet } from "@/config/fiscal-2026";
import { computePortage } from "@/lib/fiscal/portage";
import { simulate, type SimulationInput } from "@/lib/fiscal/scenarios";
import { checkPlausibility, reportPlausibility } from "@/lib/simulateur/guards";
import { buildPayload } from "@/lib/simulateur/payload";
import { DEFAULT_FORM, resolvedTjm, type FormState } from "@/lib/simulateur/state";
import type { SimulationResultPayload } from "@/types/simulation-result";

/** Ramène un formulaire reçu du réseau dans le domaine du valide. */
export function coerceForm(raw: unknown): FormState {
  const form: FormState = { ...DEFAULT_FORM };
  if (!raw || typeof raw !== "object") return form;
  const src = raw as Record<string, unknown>;
  for (const k of Object.keys(DEFAULT_FORM) as (keyof FormState)[]) {
    const v = src[k];
    if (typeof v !== typeof DEFAULT_FORM[k] || v === null || v === undefined) continue;
    if (typeof v === "number" && !Number.isFinite(v)) continue;
    (form[k] as unknown) = v;
  }
  form.gardeAlternee = Math.min(form.gardeAlternee, form.enfants);
  return form;
}

export interface BuildArgs {
  form: FormState;
  identite: { prenom: string; email: string; telephone?: string };
  simulationId: string;
  baseUrl: string;
  source?: SimulationResultPayload["meta"]["source"];
}

/** Renvoie null si les entrées ne permettent pas un calcul crédible (§4.2). */
export function buildServerPayload(args: BuildArgs): SimulationResultPayload | null {
  const { form } = args;
  const tjm = resolvedTjm(form);
  if (!form.status || !(tjm > 0) || !(form.days > 0)) return null;

  const cagnotteGross = form.cagnotte === "aucune" ? 0 : CAGNOTTE_PROVIDERS[form.cagnotte].defaultMonthly;
  const live = computePortage({
    tjm,
    days: form.days,
    ndf: form.fraisMensuels,
    cagnotteMay: cagnotteNet(form.cagnotte, cagnotteGross),
    mealVouchers: form.titresResto,
  });

  const input: SimulationInput = {
    status: form.status,  // non nul : vérifié ci-dessus
    tjmOrMonthlyGross: form.status === "salarie_esn" ? Math.round((tjm * form.days) / 1.25) : tjm,
    daysPerYear: form.days * 12,
    household: { maritalStatus: form.situation, children: form.enfants, childrenGardeAlternee: form.gardeAlternee },
    fraisReelsAnnual: form.useFraisReels && form.fraisReels > 0 ? form.fraisReels : undefined,
    versementsPER: form.per || undefined,
    dons: form.dons || undefined,
    revenusFonciers: form.foncier || undefined,
    impatrie: form.impatrie || undefined,
    cagnotteChoice: form.cagnotte,
    cagnotteMonthly: cagnotteGross || undefined,
    revenuConjoint: form.situation === "marie_pacse" && form.revenuConjoint > 0 ? form.revenuConjoint : undefined,
  };

  const result = simulate(input);
  reportPlausibility(checkPlausibility(result, form), { where: "serveur", simulationId: args.simulationId });

  return buildPayload(form, result, live, {
    identite: { prenom: args.identite.prenom, email: args.identite.email, telephone: args.identite.telephone },
    simulationId: args.simulationId,
    source: args.source,
    baseUrl: args.baseUrl,
  });
}

/** URL publique du site, déduite de la requête à défaut de configuration. */
export function baseUrlFrom(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "https://rd-portage.vercel.app";
}
