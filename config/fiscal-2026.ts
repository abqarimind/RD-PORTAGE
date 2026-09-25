/**
 * config/fiscal-2026.ts — SINGLE SOURCE OF TRUTH for every fiscal/social rate
 * and scale used by the simulator. France, income year 2025, tax year 2026.
 * Each figure carries its official source + the date it was checked. Update
 * here (and bump to a 2027 file) at the yearly law change — never in the UI.
 *
 * Verified against official sources on 2026-06-22:
 *  - Barème IR 2026, plafond QF 1 807 €/demi-part, décote 1 982 / 3 277 € :
 *    service-public.gouv.fr (F1419, A18045), economie.gouv.fr (loi de finances
 *    2026, indexation +0,9 %).
 *  - Abattement 10 % min 509 € / max 14 555 € : service-public.gouv.fr (F1989),
 *    impots.gouv.fr.
 *  - PER (revenus 2025) : plancher 4 710 €, plafond 37 680 € (10 % de 8 × PASS
 *    2025 = 47 100 €) : urssaf.fr, service-public.gouv.fr (F14709).
 *  - PASS 2026 = 48 060 € (réf.) ; le plafond PER sur revenus 2025 utilise le
 *    PASS 2025 (47 100 €). urssaf.fr / arrêté du 22/12/2025.
 *  - Cascade portage (frais 4 %, assurances/taxes 0,9 %, NDF 30 %, patronal
 *    45,6 %, salarial 21,5 %, TR 13 €/j) : Template_Simulation_RD_PORTAGE_V2.xlsx
 *    (onglet « Simul Honoraires »), validé contre le cas de référence (§8).
 */

export interface RateSource {
  label: string;
  url?: string;
  checkedAt: string;
}

/** Progressive income-tax brackets (per quotient-family share). */
export const BAREME_IR_2026 = {
  version: "2026_revenus_2025",
  source: {
    label: "Barème IR 2026 (loi de finances 2026, indexation +0,9 %)",
    url: "https://www.service-public.gouv.fr/particuliers/actualites/A18045",
    checkedAt: "2026-06-22",
  } as RateSource,
  brackets: [
    { upTo: 11_600, rate: 0.0 },
    { upTo: 29_579, rate: 0.11 },
    { upTo: 84_577, rate: 0.3 },
    { upTo: 181_917, rate: 0.41 },
    { upTo: Infinity, rate: 0.45 },
  ],
} as const;

/** Family-quotient cap per additional half-part (quarter-part = half of it). */
export const PLAFOND_DEMI_PART_2026 = 1_807;
export const PLAFOND_QUART_PART_2026 = PLAFOND_DEMI_PART_2026 / 2;
export const PLAFOND_QF_SOURCE: RateSource = {
  label: "Plafonnement du quotient familial 2026 — 1 807 €/demi-part",
  url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F1419",
  checkedAt: "2026-06-22",
};

/**
 * Décote 2026 (2025 income). Applies when gross tax is below the threshold:
 * decote = base − 45,25 % × grossTax (never below 0). The base ≈ threshold ×
 * rate (single 1 982 × 0,4525 ≈ 897 ; couple ≈ 1 484, valeur publiée).
 */
export const DECOTE_2026 = {
  single: { threshold: 1_982, base: 897 },
  couple: { threshold: 3_277, base: 1_484 },
  rate: 0.4525,
  source: {
    label: "Décote IR 2026 — seuils 1 982 € / 3 277 €",
    url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F1419",
    checkedAt: "2026-06-22",
  } as RateSource,
} as const;

/** 10% standard deduction on salaries (2025 income). */
export const ABATTEMENT_10_2026 = {
  rate: 0.1,
  min: 509,
  max: 14_555,
  source: {
    label: "Abattement forfaitaire 10 % frais pro (revenus 2025) — 509 € / 14 555 €",
    url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F1989",
    checkedAt: "2026-06-22",
  } as RateSource,
} as const;

/** PER deduction ceiling for 2025 income (PASS 2025 = 47 100 €). */
export const PER_2026 = {
  rate: 0.1,
  max: 37_680,
  floor: 4_710,
  source: {
    label: "Plafond PER revenus 2025 — 10 % des revenus pro, 4 710 € à 37 680 €",
    url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F14709",
    checkedAt: "2026-06-22",
  } as RateSource,
} as const;

/** Plafond annuel de la sécurité sociale. PASS 2025 feeds the PER ceiling. */
export const PASS = {
  pass2025: 47_100,
  pass2026: 48_060,
  source: {
    label: "PASS — 47 100 € (2025) / 48 060 € (2026)",
    url: "https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/plafonds-securite-sociale.html",
    checkedAt: "2026-06-22",
  } as RateSource,
} as const;

/** Donation reductions: 75% up to 1 000 €, then 66% (within 20% of income). */
export const DONS_2026 = {
  rate75: 0.75,
  cap75: 1_000,
  rate66: 0.66,
  capShareOfIncome: 0.2,
  source: {
    label: "Réductions dons (75 % puis 66 %)",
    url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F426",
    checkedAt: "2026-06-22",
  } as RateSource,
} as const;

/** Impatriate regime (art. 155 B CGI) — simplified 30% salary exemption. */
export const IMPATRIE_EXEMPTION_RATE = 0.3;
export const IMPATRIE_SOURCE: RateSource = {
  label: "Régime impatrié (art. 155 B CGI) — BOI-RSA-GEO-40-10",
  url: "https://bofip.impots.gouv.fr/bofip/5694-PGP.html",
  checkedAt: "2026-06-22",
};

/** Micro-BNC (freelance) parameters, 2026. */
export const MICRO_BNC_2026 = {
  abattement: 0.34,
  cotisations: 0.261,
  source: {
    label: "Micro-BNC 2026 — abattement 34 %, cotisations ~26,1 %",
    url: "https://entreprendre.service-public.gouv.fr/vosdroits/F36232",
    checkedAt: "2026-06-22",
  } as RateSource,
} as const;

/**
 * RD Portage payroll model — read directly from the formula cells of
 * Template_Simulation_RD_PORTAGE_V2.xlsx (onglet « Simul Honoraires »).
 * Blended average rates; they reproduce the reference case to the euro
 * (see lib/fiscal/__tests__/portage.test.ts and the spec §8).
 */
export const RD_PORTAGE_2026 = {
  managementFeeRate: 0.04, // frais de gestion RD — 4 % du CA HT
  insuranceTaxRate: 0.009, // forfait assurances & taxes — 0,90 % du CA HT
  employerRate: 0.456, // cotisations patronales / brut (taux agrégé Excel)
  employeeRate: 0.215, // cotisations salariales / brut (taux agrégé Excel)
  /**
   * Net imposable ≈ net + CSG/CRDS non déductible (2,9 % de 98,25 % du brut
   * ≈ 2,85 % du brut). Erreur fréquente : prendre le net versé comme base
   * imposable — cf. lib/fiscal/AUDIT.md.
   */
  csgNonDeductibleRate: 0.0285,
  /**
   * Frais professionnels (NDF) limités à 30 % du SALAIRE BRUT — retours
   * équipe #4/#42 du 25/09 (et non 30 % du CA, comme modélisé jusqu'ici).
   * ⚠️ POLITIQUE INTERNE RD Portage, sans base réglementaire (ni l'arrêté du
   * 04/09/2025 ni le BOSS ne fixent un tel plafond) : ne jamais la présenter
   * comme une limite légale. La cagnotte d'avantages s'ajoute EN PLUS, hors
   * de ces 30 %.
   */
  ndfCapShareOfGross: 0.3,
  /** Titre-restaurant : 13 €/j, 50 % salarié / 50 % compte d'activité.
   *  Part employeur (6,50 €) < plafond d'exonération URSSAF (~7,26 €) →
   *  l'avantage TR n'entre pas dans le net imposable. */
  mealVoucher: { dailyValue: 13, employeeShare: 0.5 },
  source: {
    label: "Template_Simulation_RD_PORTAGE_V2.xlsx — onglet « Simul Honoraires »",
    checkedAt: "2026-06-22",
  } as RateSource,
} as const;

/**
 * Cagnotte « avantages salariés » — enveloppe financée par le compte
 * d'activité et convertie en avantages exonérés (chèques cadeaux, services à
 * la personne, mobilité durable, culture/sport), dans les plafonds URSSAF.
 * AFFICHÉE NETTE des frais de service du prestataire. Deux prestataires sont
 * proposés au choix (l'un, l'autre, ou aucune) ; montants à figer avec RD.
 */
export interface CagnotteProvider {
  id: string;
  label: string;
  /** Montant mensuel UTILISABLE par le consultant (ce qu'il reçoit). */
  usableMonthly: number;
  /**
   * Coût mensuel prélevé sur le compte d'activité (utilisable + frais).
   * Dérivé de usableMonthly et des frais — ne pas saisir à la main.
   */
  defaultMonthly: number;
  /** Libellé public, sans jargon (retours #5 et #6). */
  publicLabel: string;
  /** Service fee taken on each top-up. */
  feeRate: number;
  /** Flat annual service fee (spread over 12 months). */
  annualFee: number;
  source: RateSource;
}

export const CAGNOTTE_PROVIDERS: Record<"may" | "wawashi", CagnotteProvider> = {
  may: provider({
    id: "may",
    label: "May",
    // Retour #5 (25/09) : 1 500 €/mois utilisables + 68,50 €/mois
    // d'abonnement. L'email de l'équipe dit 68,5 €, le tableau 68 € : on
    // retient 68,50 € — écart signalé, à confirmer (MAY_ABONNEMENT_MENSUEL).
    usableMonthly: 1_500,
    feeRate: 0,
    annualFee: 68.5 * 12,
    publicLabel: "1 500 €/mois utilisables (abonnement de 68,50 € inclus dans le calcul)",
    source: {
      label: "Retours équipe RD Portage du 25/09 — May : 1 500 €/mois + 68,50 € d'abonnement",
      checkedAt: "2026-09-25",
    },
  }),
  wawashi: provider({
    id: "wawashi",
    label: "Wawashi",
    // Retour #6 (confirmé par Ridha) : ce n'est pas un montant mensuel fixe
    // mais 18 000 €/an utilisables quand on veut. Le calcul mensuel lisse
    // l'enveloppe (18 000 / 12) ; l'affichage parle en annuel.
    usableMonthly: 18_000 / 12,
    feeRate: 0.035,
    annualFee: 60,
    publicLabel: "18 000 €/an utilisables quand vous le souhaitez (frais de service inclus dans le calcul)",
    source: { label: "Doc Wawashi — 60 €/an + 3,5 % ; retour #6 du 25/09 (18 000 €/an)", checkedAt: "2026-09-25" },
  }),
};

/** Abonnement May retenu (68,50 €) — voir le commentaire du provider. */
export const MAY_ABONNEMENT_MENSUEL = 68.5;

/**
 * Construit un prestataire à partir de son montant UTILISABLE : le coût
 * prélevé sur l'enveloppe en découle, frais compris, pour que
 * cagnotteNet(coût) redonne exactement l'utilisable.
 */
function provider(p: Omit<CagnotteProvider, "defaultMonthly">): CagnotteProvider {
  const defaultMonthly = (p.usableMonthly + p.annualFee / 12) / (1 - p.feeRate);
  return { ...p, defaultMonthly: Math.round(defaultMonthly * 100) / 100 };
}

export type CagnotteChoice = "may" | "wawashi" | "aucune";

/** Net monthly cagnotte the consultant actually receives, after service fees. */
export function cagnotteNet(choice: CagnotteChoice, grossMonthly: number): number {
  if (choice === "aucune" || grossMonthly <= 0) return 0;
  const p = CAGNOTTE_PROVIDERS[choice];
  return Math.max(0, grossMonthly * (1 - p.feeRate) - p.annualFee / 12);
}

/**
 * Part maximale de la cagnotte dans le CA (appliquée à l'aperçu ET au
 * résultat — retour #3 : l'aperçu ne la plafonnait pas).
 */
export const CAGNOTTE_MAX_SHARE_OF_FEES = 0.2;

/**
 * Cagnotte effectivement retenue pour un CA donné (mensuel ou annuel, tant
 * que les deux sont sur la même période) : valeur pour le consultant et coût
 * prélevé sur l'enveloppe, plafonnés ensemble à 20 % du CA.
 */
export function cagnotteRetenue(
  choice: CagnotteChoice,
  grossForPeriod: number,
  feesForPeriod: number,
): { value: number; cost: number } {
  if (choice === "aucune" || grossForPeriod <= 0 || feesForPeriod <= 0) return { value: 0, cost: 0 };
  const plafond = feesForPeriod * CAGNOTTE_MAX_SHARE_OF_FEES;
  const ratio = grossForPeriod > plafond ? plafond / grossForPeriod : 1;
  const cost = grossForPeriod * ratio;
  const value = cagnotteNetForPeriod(choice, grossForPeriod) * ratio;
  return { value, cost };
}

/**
 * cagnotteNet généralisé à une période quelconque : les frais fixes
 * (abonnement May, forfait Wawashi) sont comptés au prorata du nombre de
 * mois de financement contenus dans le montant (1 mois → 1/12 du forfait
 * annuel, 12 mois → le forfait entier).
 */
function cagnotteNetForPeriod(choice: CagnotteChoice, grossForPeriod: number): number {
  if (choice === "aucune") return 0;
  const p = CAGNOTTE_PROVIDERS[choice];
  const net = grossForPeriod * (1 - p.feeRate) - (p.annualFee / 12) * (grossForPeriod / p.defaultMonthly);
  return Math.max(0, net);
}

/** Headline cap claim ("jusqu'à 18 000 €/an") derives from the May reference. */
export const MAY_2026 = {
  referenceMonthlyAmount: CAGNOTTE_PROVIDERS.may.defaultMonthly,
  caps: { cadeaux: 193.2, servicesPersonne: 2_421, mobilite: 800 },
} as const;

/** Typical market management fee for competitors (anonymised comparison). */
export const MARKET_AVG_MANAGEMENT_FEE = 0.08;
