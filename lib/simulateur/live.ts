/**
 * Calculs partagés par le simulateur, le dossier, les emails et les tests.
 *
 * Cette logique était recopiée à quatre endroits (useSimulation, dossier,
 * contexte email, fixture). Chaque copie appliquait ses propres règles —
 * c'est ainsi que l'aperçu ne plafonnait pas la cagnotte alors que le
 * résultat le faisait (retour #3), et que les frais pro de l'étape Activité
 * n'atteignaient jamais le résultat (#1/#11). Source unique désormais.
 */
import { CAGNOTTE_PROVIDERS, cagnotteRetenue } from "@/config/fiscal-2026";
import { computePortage } from "@/lib/fiscal/portage";
import type { CurrentStatus, SimulationInput } from "@/lib/fiscal/scenarios";
import type { FormState } from "./state";

/** Financement mensuel de la cagnotte choisie (coût prélevé, frais compris). */
export function cagnotteGrossOf(form: FormState): number {
  return form.cagnotte === "aucune" ? 0 : CAGNOTTE_PROVIDERS[form.cagnotte].defaultMonthly;
}

/** Cascade de paie mensuelle — l'aperçu et le « comment c'est calculé ». */
export function computeLive(form: FormState, tjm: number) {
  const fees = tjm * form.days;
  const cagnotte = cagnotteRetenue(form.cagnotte, cagnotteGrossOf(form), fees);
  return computePortage({
    tjm,
    days: form.days,
    ndf: form.fraisMensuels,
    cagnotteMay: cagnotte.value,
    cagnotteCost: cagnotte.cost,
    mealVouchers: form.titresResto,
  });
}

/** Entrée du moteur à trois scénarios, construite depuis le formulaire. */
export function buildSimInput(form: FormState, tjm: number, status: CurrentStatus): SimulationInput {
  const cagnotteGross = cagnotteGrossOf(form);
  return {
    status,
    tjmOrMonthlyGross: status === "salarie_esn" ? Math.round((tjm * form.days) / 1.25) : tjm,
    daysPerYear: form.days * 12,
    household: { maritalStatus: form.situation, children: form.enfants, childrenGardeAlternee: form.gardeAlternee },
    fraisProAnnual: form.fraisMensuels > 0 ? form.fraisMensuels * 12 : undefined,
    fraisReelsAnnual: form.useFraisReels && form.fraisReels > 0 ? form.fraisReels : undefined,
    versementsPER: form.per || undefined,
    dons: form.dons || undefined,
    revenusFonciers: form.foncier || undefined,
    impatrie: form.impatrie || undefined,
    cagnotteChoice: form.cagnotte,
    cagnotteMonthly: cagnotteGross || undefined,
    revenuConjoint: form.situation === "marie_pacse" && form.revenuConjoint > 0 ? form.revenuConjoint : undefined,
  };
}
