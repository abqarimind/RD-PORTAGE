/**
 * Versioned fiscal constants — France, income year 2025, tax year 2026.
 *
 * IMPORTANT: every figure here must carry its source. When the law changes,
 * create a new versioned constant (BAREME_IR_2027, ...) instead of mutating
 * this one, so past simulations stay reproducible.
 */

/**
 * Progressive income tax brackets, "barème IR 2026" (applied to 2025 income).
 * Finance law for 2026 (promulgated 2026-02-19), brackets indexed +0.9%.
 * Sources:
 * - https://www.service-public.gouv.fr/particuliers/actualites/A18045
 * - https://simulateur-ir-ifi.impots.gouv.fr/calcul_impot/2026/complet/index.htm
 * - https://www.legifiscal.fr/actualites-fiscales/4474-ir-bareme-2026-quotient-familial-decote.html
 */
export const BAREME_IR_2026 = {
  version: "2026_revenus_2025",
  brackets: [
    { upTo: 11_600, rate: 0.0 },
    { upTo: 29_579, rate: 0.11 },
    { upTo: 84_577, rate: 0.3 },
    { upTo: 181_917, rate: 0.41 },
    { upTo: Infinity, rate: 0.45 },
  ],
} as const;

/**
 * Family quotient ("quotient familial") cap per additional half-part: 1 807 €.
 * A quarter-part (shared custody / garde alternée) is capped at half of that.
 * Source: BOFiP BOI-IR-LIQ-20-20-20 (version 2026-04-07)
 * https://bofip.impots.gouv.fr/bofip/2494-PGP.html/identifiant=BOI-IR-LIQ-20-20-20-20260407
 */
export const PLAFOND_DEMI_PART_2026 = 1_807;
export const PLAFOND_QUART_PART_2026 = PLAFOND_DEMI_PART_2026 / 2;

/**
 * Décote 2026 (2025 income). Applies when gross tax is below the threshold.
 * decote = base − 45.25% × grossTax (never below 0).
 * Source: https://www.legifiscal.fr/actualites-fiscales/4474-ir-bareme-2026-quotient-familial-decote.html
 */
export const DECOTE_2026 = {
  single: { threshold: 1_982, base: 897 },
  couple: { threshold: 3_277, base: 1_484 },
  rate: 0.4525,
} as const;

/**
 * 10% standard deduction for professional expenses on salaries.
 * Max for 2025 income: 14 426 € (2024 income) indexed +0.9% ≈ 14 556 €.
 * TODO(verify): confirm exact 2025-income ceiling on impots.gouv.fr before go-live.
 * Source (mechanism): https://www.service-public.gouv.fr/particuliers/vosdroits/F1989
 */
export const ABATTEMENT_10_2026 = { rate: 0.1, min: 504, max: 14_556 } as const;

/**
 * PER (retirement savings) deduction ceiling, 2026 filing on 2025 income:
 * 10% of net professional income, capped at 37 680 €, floor 4 710 €.
 * Source: https://www.service-public.gouv.fr/particuliers/vosdroits/F14709
 */
export const PER_2026 = { rate: 0.1, max: 37_680, floor: 4_710 } as const;

/**
 * Donation tax reductions: 75% up to 1 000 € for organisms helping people in
 * need ("dispositif Coluche"), 66% beyond (within 20% of taxable income).
 * Source: https://www.service-public.gouv.fr/particuliers/vosdroits/F426
 */
export const DONS_2026 = {
  rate75: 0.75,
  cap75: 1_000,
  rate66: 0.66,
  capShareOfIncome: 0.2,
} as const;

/**
 * Impatriate regime (art. 155 B CGI): the impatriation premium is exempt from
 * income tax; the 30% flat option is used here as a simplification.
 * Eligibility conditions apply (recruited from abroad, etc.) — shown as a
 * footnote in the UI, never applied silently.
 * Source: https://bofip.impots.gouv.fr/bofip/5694-PGP.html (BOI-RSA-GEO-40-10)
 */
export const IMPATRIE_EXEMPTION_RATE = 0.3;

/**
 * Micro-BNC (freelance) parameters, 2026:
 * 34% flat expense allowance; social contributions 26.1% of turnover.
 * Source: https://entreprendre.service-public.gouv.fr/vosdroits/F36232
 * TODO(verify): 26.1% is the 2026 BNC rate after the 2024 decree phase-in.
 */
export const MICRO_BNC_2026 = { abattement: 0.34, cotisations: 0.261 } as const;

/**
 * RD Portage payroll model — reverse-engineered from the official internal
 * simulation workbook "Simulation_RD_PORTAGE_420" (client document, 2025):
 * TJM 420 € × 20 days = 8 400 € fees → management 4% (336 €), insurance 0.90%
 * (76 €), available account 5 918 € → gross salary 4 065 €, employer
 * contributions 1 854 € (≈45.6% of gross), employee contributions 874 €
 * (≈21.5% of gross), net 3 191 €.
 * These are blended average rates; actual rates vary with salary level.
 */
export const RD_PORTAGE_2026 = {
  managementFeeRate: 0.04, // 4% of invoiced fees — RD Portage pricing
  insuranceTaxRate: 0.009, // 0.90% "forfait assurances et taxes"
  employerRate: 0.456, // blended employer contributions / gross
  employeeRate: 0.215, // blended employee contributions / gross
  /**
   * Net taxable salary ≈ net paid + non-deductible CSG/CRDS (2.9% of 98.25%
   * of gross ≈ 2.85% of gross). A frequent prototype error is to use net paid
   * as taxable income — see lib/fiscal/AUDIT.md.
   */
  csgNonDeductibleRate: 0.0285,
  /** Expense refunds capped at 30% of monthly invoiced fees (frais pro guide 2024). */
  ndfCapShareOfFees: 0.3,
  /** Swile meal voucher: 13 €/worked day, 50% employee / 50% activity account. */
  mealVoucher: { dailyValue: 13, employeeShare: 0.5 },
} as const;

/**
 * May benefits wallet ("cagnotte avantages") — per RD Portage × May deck and
 * the internal simulation (1 570 €/month in the reference case ≈ 18 800 €/yr).
 * Category caps (May deck, client document): gifts 193.20 €/yr, personal
 * services 2 421 €/yr, sustainable mobility 800 €/yr, holidays/culture/sport
 * uncapped on receipts, within URSSAF doctrine.
 * The headline claim "jusqu'à 18 000 €/an" derives from this reference case.
 */
export const MAY_2026 = {
  referenceMonthlyAmount: 1_570,
  caps: { cadeaux: 193.2, servicesPersonne: 2_421, mobilite: 800 },
} as const;

/** Typical market management fee for competitors (anonymised comparison default). */
export const MARKET_AVG_MANAGEMENT_FEE = 0.08;
