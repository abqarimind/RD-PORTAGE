/** Payload de référence pour les tests d'emails et de dossier. */
import { computePortage } from "@/lib/fiscal/portage";
import { simulate } from "@/lib/fiscal/scenarios";
import { buildPayload } from "@/lib/simulateur/payload";
import { DEFAULT_FORM, resolvedTjm, type FormState } from "@/lib/simulateur/state";
import type { SimulationResultPayload } from "@/types/simulation-result";
import { CAGNOTTE_PROVIDERS, cagnotteNet } from "@/config/fiscal-2026";

export function makePayload(patch: Partial<FormState> = {}): SimulationResultPayload {
  const form: FormState = { ...DEFAULT_FORM, ...patch };
  const tjm = resolvedTjm(form);
  const cagnotteGross = form.cagnotte === "aucune" ? 0 : CAGNOTTE_PROVIDERS[form.cagnotte].defaultMonthly;

  const live = computePortage({
    tjm,
    days: form.days,
    ndf: form.fraisMensuels,
    cagnotteMay: cagnotteNet(form.cagnotte, cagnotteGross),
    mealVouchers: form.titresResto,
  });
  const result = simulate({
    status: form.status,
    tjmOrMonthlyGross: form.status === "salarie_esn" ? Math.round((tjm * form.days) / 1.25) : tjm,
    daysPerYear: form.days * 12,
    household: { maritalStatus: form.situation, children: form.enfants, childrenGardeAlternee: form.gardeAlternee },
    cagnotteChoice: form.cagnotte,
    cagnotteMonthly: cagnotteGross || undefined,
  });

  return buildPayload(form, result, live, {
    identite: { prenom: "Camille", email: "camille@example.com", telephone: "0612345678" },
    simulationId: "sim-fixture-1",
    dateSimulation: "2026-09-15T10:00:00.000Z",
    baseUrl: "https://rd-portage.vercel.app",
  });
}
