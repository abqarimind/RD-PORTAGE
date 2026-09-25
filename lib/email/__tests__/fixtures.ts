/** Payload de référence pour les tests d'emails et de dossier. */
import { simulate } from "@/lib/fiscal/scenarios";
import { buildSimInput, computeLive } from "@/lib/simulateur/live";
import { buildPayload } from "@/lib/simulateur/payload";
import { DEFAULT_FORM, resolvedTjm, type FormState } from "@/lib/simulateur/state";
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
