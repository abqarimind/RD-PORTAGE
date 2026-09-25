"use client";

/**
 * Dérivés du store — spec §4.3 : tout ce qui s'affiche descend d'ici.
 *
 * Aucun écran n'a le droit de recalculer un montant ou de décider seul d'un
 * libellé : il lit ce hook. C'est la garantie structurelle que le libellé,
 * le montant et le détail du calcul ne peuvent plus diverger (BUG-04).
 */
import { useMemo } from "react";
import { simulate, type SimulationInput } from "@/lib/fiscal/scenarios";
import { buildSimInput, computeLive } from "./live";
import { checkPlausibility, reportPlausibility, validateInputs, type MissingInput } from "./guards";
import { buildAvantages } from "./payload";
import { resolvedTjm, type FormState } from "./state";
import { useSimulator } from "./store";

export function useSimulation() {
  const { state } = useSimulator();
  const { form } = state;

  const tjm = resolvedTjm(form);

  /** Cascade de paie mensuelle — le « comment c'est calculé » (source unique : ./live). */
  const live = useMemo(() => computeLive(form, tjm), [form, tjm]);

  // `status` peut être nul tant que l'étape Profil n'est pas franchie ; le
  // repli n'est utilisé que pour garder un objet typé, jamais pour calculer —
  // `missing` bloque l'affichage en amont.
  const simInput: SimulationInput = useMemo(() => buildSimInput(form, tjm, form.status ?? "freelance_micro"), [form, tjm]);

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

  return { form, live, result, simInput, missing, avantages, tjm };
}

export type Simulation = ReturnType<typeof useSimulation>;
export type { FormState };
