/**
 * Résumé de simulation en une ligne, pour l'équipe (notification interne,
 * propriété Resend `resume_simulation`). INTERNE UNIQUEMENT : il porte des
 * montants et la situation familiale, il ne part jamais vers Meta, Plausible
 * ni dans une URL.
 */
import { groupFr } from "@/lib/format";
import type { SimulationResultPayload } from "@/types/simulation-result";

const eur = (n: number) => `${groupFr(Math.round(n))} €`;
const pct = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")} %`;

export function resumeSimulation(p: SimulationResultPayload): string {
  const a = p.activite;
  const tjm =
    a.tjmMode === "fourchette" && a.tjmFourchette
      ? `TJM ${a.tjmFourchette.label} (calcul ${eur(a.tjmFourchette.mediane)})`
      : `TJM ${eur(a.tjm)}`;
  const enfants = p.foyer.enfants === 0 ? "sans enfant" : `${p.foyer.enfants} enfant${p.foyer.enfants > 1 ? "s" : ""}`;
  const garde = p.foyer.enfantsGardeAlternee > 0 ? ` (dont ${p.foyer.enfantsGardeAlternee} en garde alternée)` : "";
  const r = p.resultats;
  const ecart = !r.comparable
    ? "pas de situation actuelle à comparer"
    : r.laisseSurLaTable === 0
      ? "écart nul avec le statut actuel"
      : `${r.laisseSurLaTable > 0 ? "+" : "−"}${eur(Math.abs(r.laisseSurLaTable))}/an en portage optimisé vs statut actuel`;
  return [
    p.identite.profilLabel,
    tjm,
    `${a.joursFactures} j/mois`,
    `${p.foyer.situationLabel}, ${enfants}${garde}`,
    `net perçu ${eur(r.mensuel.percuNet)}/mois`,
    `taux foyer ${pct(r.tauxMoyenImposition)}`,
    ecart,
  ]
    .join(" · ")
    .slice(0, 500);
}
