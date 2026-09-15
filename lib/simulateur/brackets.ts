/**
 * Fourchettes de TJM — source unique, partagée par le diagnostic flash
 * (accueil + /lp) et par le simulateur.
 *
 * Jusqu'ici, le simulateur ne connaissait pas ces fourchettes : un
 * utilisateur qui revenait en arrière retombait sur celle de la landing sans
 * qu'aucune valeur ne soit transmise (BUG-02). Elles sont désormais la
 * monnaie d'échange du relais diagnostic → simulateur
 * (lib/diagnostic/answers.ts).
 *
 * Règle de conversion validée par le client (§9.1) : une fourchette se
 * calcule sur sa VALEUR MÉDIANE. L'utilisateur peut basculer en saisie
 * exacte à tout moment, et inversement.
 */

export interface TjmBracket {
  id: string;
  label: string;
  /** Borne basse en € HT/jour. */
  min: number;
  /** Borne haute en € HT/jour. */
  max: number;
  /** Valeur de calcul retenue (§9.1). */
  mediane: number;
  /** Équivalent salaire brut mensuel, pour les profils salariés. */
  brutMensuel: number;
}

export const TJM_BRACKETS: TjmBracket[] = [
  { id: "lt350", label: "Moins de 350 €", min: 150, max: 350, mediane: 300, brutMensuel: 3_000 },
  { id: "350-500", label: "350 à 500 €", min: 350, max: 500, mediane: 425, brutMensuel: 4_250 },
  { id: "500-650", label: "500 à 650 €", min: 500, max: 650, mediane: 575, brutMensuel: 5_750 },
  { id: "gt650", label: "Plus de 650 €", min: 650, max: 2_000, mediane: 700, brutMensuel: 7_000 },
];

/** Libellé double (TJM / brut mensuel) utilisé par le diagnostic flash. */
export const bracketLabelWithGross = (b: TjmBracket): string =>
  b.id === "lt350"
    ? "Moins de 350 € / 3 500 €"
    : b.id === "gt650"
      ? "Plus de 650 € / 6 500 €"
      : `${b.min} à ${b.max} € / ${b.min * 10} à ${b.max * 10} €`;

export const findBracket = (id: string | null | undefined): TjmBracket | undefined =>
  id ? TJM_BRACKETS.find((b) => b.id === id) : undefined;

/**
 * Fourchette contenant une valeur exacte — sert à pré-sélectionner la bonne
 * fourchette quand l'utilisateur bascule d'exact vers fourchette, pour que le
 * basculement ne perde jamais l'ordre de grandeur saisi.
 */
export function bracketForValue(tjm: number): TjmBracket {
  return TJM_BRACKETS.find((b) => tjm >= b.min && tjm < b.max) ?? TJM_BRACKETS[TJM_BRACKETS.length - 1];
}
