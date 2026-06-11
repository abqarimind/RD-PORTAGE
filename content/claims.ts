/**
 * Single source of truth for every factual figure used in the funnel
 * (Atarhib / Targhib). A claim WITHOUT a source renders as the
 * "[SOURCE REQUISE]" placeholder and must never ship as-is.
 *
 * The nominative competitor comparison is gated behind
 * COMPARATIF_LEGAL_VALIDATED (env) — anonymised by default.
 */

export interface Claim {
  id: string;
  /** French copy, ready to render. */
  text: string;
  /** Plain figure when the UI needs it raw. */
  value?: string;
  source?: { label: string; url?: string; checkedAt: string };
  /** Eligibility condition shown as a legal footnote. */
  condition?: string;
}

export function claimText(c: Claim): string {
  return c.source ? c.text : `[SOURCE REQUISE] ${c.text}`;
}

export const CLAIMS: Record<string, Claim> = {
  // ——— ATARHIB (factual fear) ———————————————————————————————
  redressement_personnel_2024: {
    id: "redressement_personnel_2024",
    text:
      "En cas de redressement URSSAF sur des frais ou avantages injustifiés, la régularisation s'impute sur la paie du salarié porté : c'est votre rémunération qui est corrigée, pas seulement celle de la société.",
    source: {
      label: "Guide du portage — URSSAF & portage salarial (analyse des redressements)",
      url: "https://www.guideduportage.com/actualite/portage-salarial-urssaf-lieu-de-travail",
      checkedAt: "2026-06-11",
    },
    condition:
      "La formulation « redressable personnellement depuis 2024 » reste soumise à validation juridique avant publication.",
  },
  exemple_15k_60k: {
    id: "exemple_15k_60k",
    text:
      "15 000 € d'avantages indus perçus aujourd'hui peuvent coûter jusqu'à 60 000 € demain : cotisations rappelées sur 3 ans, majorations de retard, pénalités et impôt redressé.",
    value: "15 000 € → 60 000 €",
    condition:
      "Ordre de grandeur illustratif construit sur les majorations URSSAF (art. R243-18 CSS) et le rappel triennal — à valider juridiquement avant publication.",
    // No source yet → renders as [SOURCE REQUISE] until legal validation.
  },
  controles_urssaf_x3: {
    id: "controles_urssaf_x3",
    text: "Les redressements URSSAF visant le portage salarial ont triplé en deux ans.",
    // Client claim — no public source provided yet → [SOURCE REQUISE].
  },
  prescription_3_ans: {
    id: "prescription_3_ans",
    text: "L'URSSAF peut remonter 3 années civiles complètes (5 en cas de travail dissimulé).",
    source: {
      label: "Code de la sécurité sociale, art. L244-3",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000037203219",
      checkedAt: "2026-06-11",
    },
  },

  // ——— TARGHIB (factual desire) ——————————————————————————————
  avantages_18000: {
    id: "avantages_18000",
    text:
      "Jusqu'à 18 000 €/an d'avantages exonérés via les dispositifs légaux (cagnotte May, titres-restaurant, mobilité durable, services à la personne).",
    value: "18 000 €/an",
    source: {
      label: "Simulation officielle RD Portage (cagnotte 1 570 €/mois) + présentation May × RD Portage",
      checkedAt: "2026-06-11",
    },
    condition:
      "Sous conditions d'éligibilité URSSAF par catégorie : cadeaux 193,20 €/an, services à la personne 2 421 €/an, mobilité 800 €/an, sur justificatifs.",
  },
  frais_gestion_4: {
    id: "frais_gestion_4",
    text: "4 % de frais de gestion, tout compris : 400 € pour 10 000 € de CA porté.",
    value: "4 %",
    source: { label: "Grille tarifaire RD Portage", checkedAt: "2026-06-11" },
  },
  ca_optimise_40: {
    id: "ca_optimise_40",
    text:
      "Jusqu'à 40 % de votre chiffre d'affaires optimisé dans les règles : 30 % de frais professionnels remboursables + dispositifs d'avantages salariés.",
    value: "40 % du CA",
    source: {
      label: "Guide des frais professionnels RD Portage 2024 (plafond NDF 30 % du CA mensuel)",
      checkedAt: "2026-06-11",
    },
    condition: "Frais réels justifiés, plafond 30 % du CA HT mensuel, justificatifs avec TVA.",
  },
  restitution_64: {
    id: "restitution_64",
    text: "Cas de référence TJM 420 € : 64 % du CA restitué net, avantages inclus.",
    value: "64 %",
    source: { label: "Simulation officielle RD Portage TJM 420", checkedAt: "2026-06-11" },
    condition: "Cas type : 20 jours/mois, NDF 500 €, cagnotte 1 570 €, titres-restaurant.",
  },

  // ——— PROOF ————————————————————————————————————————————————
  preuve_societe: {
    id: "preuve_societe",
    text: "RD Portage — société de portage salarial depuis 2021, ~30 consultants portés, Montigny-le-Bretonneux.",
    source: {
      label: "RCS Versailles n° 912 888 013",
      url: "https://annuaire-entreprises.data.gouv.fr/entreprise/912888013",
      checkedAt: "2026-06-11",
    },
  },
};

/** Nominative competitor table — LOCKED until legal validation.
 *  Data must come from official public sources only (competitor sites, legal
 *  documents), each with URL + retrieval date. */
export interface CompetitorRow {
  /** Public name — only shown when COMPARATIF_LEGAL_VALIDATED=true. */
  name: string;
  anonymousLabel: string;
  managementFee: string;
  source?: { label: string; url: string; checkedAt: string };
}

export const COMPETITORS: CompetitorRow[] = [
  {
    name: "Admissions",
    anonymousLabel: "Acteur A",
    managementFee: "8 %",
    // TODO(legal): add official public source URL + date before enabling the flag.
  },
  {
    name: "Acteur B (à compléter)",
    anonymousLabel: "Acteur B",
    managementFee: "7 à 10 %",
  },
];

export function comparatifLegalValidated(): boolean {
  return process.env.COMPARATIF_LEGAL_VALIDATED === "true";
}
