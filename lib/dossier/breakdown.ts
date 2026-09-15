/**
 * Modèle d'affichage du dossier : du contrat de données aux marques du graphe.
 *
 * Ce module est PUR et vit dans `lib/` pour une raison précise : la cascade
 * affichée doit boucler, et une erreur d'arithmétique y est invisible à
 * l'œil. La version précédente réinitialisait le cumul à chaque palier, ce
 * qui masquait un écart de 130 €/mois sur le cas type (les titres-restaurant
 * étaient comptés en valeur faciale alors que la moitié sort du net du
 * salarié). Tant que la dérivation vivait dans le composant, aucun test ne
 * pouvait l'attraper.
 */
import type { SimulationResultPayload } from "@/types/simulation-result";

export interface CascadeStep {
  label: string;
  /** Montant du pas. Négatif = prélèvement, positif = apport. */
  delta: number;
  /** Vrai pour les paliers (CA HT, disponible, salaire net, perçu net). */
  total?: boolean;
}

export interface PartagePart {
  label: string;
  value: number;
  /** Précision courte sous le libellé, dans la légende. */
  note?: string;
  /** La part qui revient à la personne : seule marque en accent. */
  accent?: boolean;
}

export interface CascadeBar {
  label: string;
  from: number;
  to: number;
  delta: number;
  total: boolean;
  /** Cumul AVANT ce pas — abscisse du connecteur venant de la ligne au-dessus. */
  entree: number;
  /** Cumul APRÈS ce pas — abscisse du connecteur vers la ligne suivante. */
  running: number;
}

const eur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;

/** Tolérance d'arrondi : chaque montant du contrat est déjà arrondi à l'euro. */
const TOLERANCE = 1;

/**
 * Construit les barres et vérifie que la cascade boucle.
 *
 * Un palier n'IMPOSE pas le cumul : il l'ATTESTE. Si les pas ne tombent pas
 * sur le palier annoncé, l'écart est remonté plutôt que gommé.
 */
export function buildCascadeBars(steps: CascadeStep[]): { bars: CascadeBar[]; ecarts: string[] } {
  const bars: CascadeBar[] = [];
  const ecarts: string[] = [];
  let running = 0;

  steps.forEach((s, i) => {
    if (s.total) {
      if (i > 0 && Math.abs(running - s.delta) > TOLERANCE) {
        ecarts.push(`« ${s.label} » annoncé à ${eur(s.delta)} alors que les pas cumulent ${eur(running)}`);
      }
      // Le premier palier amorce la cascade ; les suivants la constatent.
      if (i === 0) running = s.delta;
      bars.push({ label: s.label, from: 0, to: running, delta: running, total: true, entree: running, running });
    } else {
      const avant = running;
      const next = avant + s.delta;
      bars.push({
        label: s.label,
        from: Math.min(avant, next),
        to: Math.max(avant, next),
        delta: s.delta,
        total: false,
        entree: avant,
        running: next,
      });
      running = next;
    }
  });

  return { bars, ecarts };
}

/** Grandeurs intermédiaires de la paie, recalculées PAR DIFFÉRENCES. */
export function derivePaie(payload: SimulationResultPayload) {
  const m = payload.resultats.mensuel;
  const chargesPatronales = m.disponible - m.brut;
  const netSalaire = m.brut - m.cotisationsSalariales;
  // `m.titresResto` est la valeur faciale ; la moitié est financée par le
  // salarié (cf. lib/fiscal/portage.ts). Seule la part entreprise est un
  // apport, et on l'obtient par différence pour que la dernière marche
  // tombe exactement sur le perçu net.
  const partEntrepriseTR = m.percuNet - netSalaire - m.fraisPro;
  const fraisRd = m.fraisDeGestion + m.assurancesTaxes;
  const cotisations = chargesPatronales + m.cotisationsSalariales;
  // Obtenue par différence, jamais par addition : sinon les arrondis la
  // feraient dépasser le total de la barre.
  const pourVous = m.caHt - fraisRd - cotisations;
  return { chargesPatronales, netSalaire, partEntrepriseTR, fraisRd, cotisations, pourVous };
}

export function buildCascadeSteps(payload: SimulationResultPayload): CascadeStep[] {
  const m = payload.resultats.mensuel;
  const { chargesPatronales, netSalaire, partEntrepriseTR } = derivePaie(payload);

  return [
    { label: "CA HT facturé", delta: m.caHt, total: true },
    { label: "Frais de gestion", delta: -m.fraisDeGestion },
    { label: "Assurances & taxes", delta: -m.assurancesTaxes },
    ...(m.fraisPro > 0 ? [{ label: "Frais professionnels avancés", delta: -m.fraisPro }] : []),
    ...(m.cagnotte > 0 ? [{ label: "Cagnotte avantages", delta: -m.cagnotte }] : []),
    { label: "Disponible pour votre salaire", delta: m.disponible, total: true },
    { label: "Charges patronales", delta: -chargesPatronales },
    { label: "Cotisations salariales", delta: -m.cotisationsSalariales },
    { label: "Salaire net", delta: netSalaire, total: true },
    ...(m.fraisPro > 0 ? [{ label: "Frais professionnels remboursés", delta: m.fraisPro }] : []),
    ...(partEntrepriseTR >= 1
      ? [{ label: "Titres-restaurant (part entreprise)", delta: partEntrepriseTR }]
      : []),
    { label: "Perçu net", delta: m.percuNet, total: true },
  ];
}

export function buildPartage(payload: SimulationResultPayload): { parts: PartagePart[]; hint: string } {
  const m = payload.resultats.mensuel;
  const { fraisRd, cotisations, pourVous, partEntrepriseTR } = derivePaie(payload);

  const parts: PartagePart[] = [
    {
      label: "Ce qui vous revient",
      value: pourVous,
      note: [m.cagnotte > 0 ? "salaire net et avantages" : "salaire net", m.fraisPro > 0 ? "+ frais remboursés" : ""]
        .filter(Boolean)
        .join(" "),
      accent: true,
    },
    { label: "Cotisations sociales", value: cotisations, note: "retraite, santé, chômage, prévoyance" },
    { label: "Frais RD Portage", value: fraisRd, note: "gestion, assurances et taxes" },
  ];

  // La page affiche deux pourcentages voisins : la jauge (rémunération
  // globale / CA) et la barre ci-dessus (part qui revient / CA). Ils diffèrent
  // des titres-restaurant financés par l'entreprise, qui ne sortent pas du CA.
  // La mention fait le pont explicitement plutôt que de laisser le lecteur
  // buter sur l'écart.
  const tauxJauge = `${(payload.resultats.tauxRestitution * 100).toFixed(1).replace(".", ",")} %`;
  const hint =
    partEntrepriseTR >= 1
      ? `Avec les ${eur(partEntrepriseTR)} de titres-restaurant financés par RD Portage, votre rémunération globale atteint ${eur(m.remunerationGlobale)} par mois, soit les ${tauxJauge} affichés plus haut.`
      : `Votre rémunération globale atteint ${eur(m.remunerationGlobale)} par mois, soit les ${tauxJauge} affichés plus haut.`;

  return { parts, hint };
}
