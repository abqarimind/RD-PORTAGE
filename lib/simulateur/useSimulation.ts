"use client";

/**
 * Dérivés du store — spec §4.3 : tout ce qui s'affiche descend d'ici.
 *
 * Aucun écran n'a le droit de recalculer un montant ou de décider seul d'un
 * libellé : il lit ce hook. C'est la garantie structurelle que le libellé,
 * le montant et le détail du calcul ne peuvent plus diverger (BUG-04).
 */
import { useMemo } from "react";
import { CAGNOTTE_PROVIDERS, cagnotteNet } from "@/config/fiscal-2026";
import { computePortage } from "@/lib/fiscal/portage";
import { simulate, type SimulationInput } from "@/lib/fiscal/scenarios";
import { checkPlausibility, reportPlausibility, validateInputs, type MissingInput } from "./guards";
import { buildAvantages } from "./payload";
import { resolvedTjm, type FormState } from "./state";
import { useSimulator } from "./store";

export function useSimulation() {
  const { state } = useSimulator();
  const { form } = state;

  const tjm = resolvedTjm(form);

  const cagnotteGross = form.cagnotte === "aucune" ? 0 : CAGNOTTE_PROVIDERS[form.cagnotte].defaultMonthly;
  const cagnotteNetMonthly = cagnotteNet(form.cagnotte, cagnotteGross);

  /** Cascade de paie mensuelle — le « comment c'est calculé ». */
  const live = useMemo(
    () =>
      computePortage({
        tjm,
        days: form.days,
        ndf: form.fraisMensuels,
        cagnotteMay: cagnotteNetMonthly,
        // Dérivé de l'état, plus jamais codé en dur (BUG-04).
        mealVouchers: form.titresResto,
      }),
    [tjm, form.days, form.fraisMensuels, cagnotteNetMonthly, form.titresResto],
  );

  // `status` peut être nul tant que l'étape Profil n'est pas franchie ; le
  // repli n'est utilisé que pour garder un objet typé, jamais pour calculer —
  // `missing` bloque l'affichage en amont.
  const simInput: SimulationInput = useMemo(
    () => ({
      status: form.status ?? "freelance_micro",
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
    }),
    [form, tjm, cagnotteGross],
  );

  /** Ce qui manque pour calculer — vide = on peut afficher des chiffres. */
  const missing: MissingInput[] = useMemo(() => validateInputs(form), [form]);

  const result = useMemo(() => (missing.length > 0 ? null : simulate(simInput)), [missing.length, simInput]);

  // Observabilité (§4.5) : un résultat aberrant est journalisé, jamais tu.
  useMemo(() => {
    if (!result) return;
    const issues = checkPlausibility(result, form);
    reportPlausibility(issues, { status: form.status, tjm, days: form.days });
  }, [result, form, tjm]);

  /** Avantages réellement retenus — source unique de « avantages inclus ». */
  const avantages = useMemo(() => buildAvantages(form, live.mealVoucherCredit), [form, live.mealVoucherCredit]);

  return { form, live, result, simInput, missing, avantages, tjm, cagnotteNetMonthly, cagnotteGross };
}

export type Simulation = ReturnType<typeof useSimulation>;
export type { FormState };
