/**
 * Fabrication du payload de récapitulatif côté serveur.
 *
 * Le serveur RECALCULE la simulation à partir du formulaire transmis plutôt
 * que de reprendre les montants envoyés par le navigateur : c'est le seul
 * moyen de garantir que l'email, le dossier et l'écran affichent les mêmes
 * chiffres, et que ces chiffres sortent bien du moteur fiscal.
 */
import { simulate, type SimulationInput } from "@/lib/fiscal/scenarios";
import { checkPlausibility, reportPlausibility } from "@/lib/simulateur/guards";
import { buildSimInput, computeLive } from "@/lib/simulateur/live";
import { buildPayload } from "@/lib/simulateur/payload";
import { coerceFormState, resolvedTjm, type FormState } from "@/lib/simulateur/state";
import type { SimulationResultPayload } from "@/types/simulation-result";

/**
 * Ramène un formulaire reçu du réseau dans le domaine du valide.
 * Délègue à la source unique de lib/simulateur/state.ts : la restauration
 * locale et les routes d'API doivent valider exactement de la même façon.
 */
export const coerceForm = coerceFormState;

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

  const live = computeLive(form, tjm);
  const input: SimulationInput = buildSimInput(form, tjm, form.status); // statut non nul : vérifié ci-dessus

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
  // Dernier repli seulement : en pratique NEXT_PUBLIC_SITE_URL ou l'en-tête
  // Host répondent toujours.
  return host ? `${proto}://${host}` : "https://simulateur.rdportage.com";
}
