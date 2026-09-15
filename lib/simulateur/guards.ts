/**
 * INVARIANT ANTI-ZÉRO (spec §4.2) — règle non négociable.
 *
 * Un écran de résultat ne doit jamais afficher 0 €, NaN, undefined ou « — »
 * sans explication. Deux niveaux :
 *
 *  - `validateInputs` : les entrées suffisent-elles à calculer ? Sinon on
 *    renvoie ce qui manque ET l'étape où le corriger, pour que l'écran
 *    propose un bouton de retour ciblé plutôt qu'un chiffre vide.
 *  - `assertPlausible` : le résultat produit est-il crédible ? Un résultat
 *    non plausible est journalisé (console structurée + remontée serveur)
 *    au lieu d'être affiché en silence — c'est exactement ce qui a manqué
 *    quand BUG-06 a échoué sans bruit (spec §4.5).
 */
import type { SimulationResult } from "@/lib/fiscal/scenarios";
import { resolvedTjm, type FormState, type Step } from "./state";

export interface MissingInput {
  /** Ce qui manque, rédigé pour l'utilisateur. */
  message: string;
  /** Étape à laquelle le corriger. */
  step: Step;
  /** Libellé du bouton de retour. */
  cta: string;
}

/**
 * Renvoie la liste (éventuellement vide) de ce qui empêche un calcul crédible.
 * L'écran de résultats n'affiche de chiffres que si cette liste est vide.
 */
export function validateInputs(form: FormState): MissingInput[] {
  const missing: MissingInput[] = [];
  const tjm = resolvedTjm(form);

  // Le profil détermine l'intégralité de la comparaison : sans lui, aucun
  // chiffre n'a de sens (§4.3). Il n'a plus de valeur par défaut.
  if (!form.status) {
    missing.push({
      message: "Votre profil n'est pas renseigné — c'est lui qui détermine tout le calcul.",
      step: "profil",
      cta: "Choisir mon profil",
    });
  }

  if (!Number.isFinite(tjm) || tjm <= 0) {
    missing.push({
      message: "Votre TJM (ou votre fourchette de TJM) n'est pas renseigné.",
      step: "activite",
      cta: "Renseigner mon TJM",
    });
  }
  if (!Number.isFinite(form.days) || form.days <= 0) {
    missing.push({
      message: "Votre nombre de jours facturés par mois n'est pas renseigné.",
      step: "activite",
      cta: "Renseigner mes jours facturés",
    });
  }
  if (form.situation === "marie_pacse" && !Number.isFinite(form.revenuConjoint)) {
    missing.push({
      message: "Le revenu imposable de votre conjoint n'est pas exploitable.",
      step: "foyer",
      cta: "Corriger mon foyer",
    });
  }
  if (form.useFraisReels && (!Number.isFinite(form.fraisReels) || form.fraisReels <= 0)) {
    missing.push({
      message: "Vous avez choisi les frais réels sans en indiquer le montant.",
      step: "foyer",
      cta: "Renseigner mes frais réels",
    });
  }
  return missing;
}

export interface PlausibilityIssue {
  field: string;
  value: number;
  reason: string;
}

/**
 * Contrôle de plausibilité du résultat calculé. Ne masque rien à
 * l'utilisateur : sert à faire remonter un calcul aberrant côté
 * observabilité plutôt qu'à l'afficher tel quel.
 */
export function checkPlausibility(result: SimulationResult, form: FormState): PlausibilityIssue[] {
  const issues: PlausibilityIssue[] = [];
  const optimise = result.scenarios[2];

  const numbers: [string, number][] = [
    ["economieAnnuelleEur", result.economieAnnuelleEur],
    ["optimise.netPercu", optimise?.netPerceived ?? NaN],
    ["optimise.disponible", optimise?.disposable ?? NaN],
    ["optimise.tauxMoyen", optimise?.averageTaxRate ?? NaN],
  ];
  for (const [field, value] of numbers) {
    if (!Number.isFinite(value)) issues.push({ field, value, reason: "valeur non finie (NaN/Infinity)" });
  }

  const tjm = resolvedTjm(form);
  if (tjm > 0 && form.days > 0) {
    if (optimise && optimise.netPerceived <= 0) {
      issues.push({
        field: "optimise.netPercu",
        value: optimise.netPerceived,
        reason: "net perçu nul ou négatif alors que le CA est strictement positif",
      });
    }
    // Un taux de restitution hors [0,1] signale une cascade incohérente.
    const caAnnuel = tjm * form.days * 12;
    if (optimise && caAnnuel > 0 && optimise.netPerceived > caAnnuel) {
      issues.push({
        field: "optimise.netPercu",
        value: optimise.netPerceived,
        reason: "net perçu supérieur au chiffre d'affaires",
      });
    }
  }
  return issues;
}

/**
 * Journalise les incohérences détectées. Côté navigateur : console
 * structurée. Côté serveur : même format, capté par les logs Vercel.
 */
export function reportPlausibility(issues: PlausibilityIssue[], context: Record<string, unknown> = {}): void {
  if (issues.length === 0) return;
  console.error("[simulateur] résultat non plausible", JSON.stringify({ issues, context }));
}
