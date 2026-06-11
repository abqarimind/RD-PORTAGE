/**
 * Household income tax engine ("IR foyer").
 * Pure functions, no I/O — fully unit-tested in __tests__/ir.test.ts.
 * All amounts are annual euros unless stated otherwise.
 */
import {
  ABATTEMENT_10_2026,
  BAREME_IR_2026,
  DECOTE_2026,
  DONS_2026,
  IMPATRIE_EXEMPTION_RATE,
  PER_2026,
  PLAFOND_DEMI_PART_2026,
  PLAFOND_QUART_PART_2026,
} from "./constants";

export type MaritalStatus = "celibataire" | "marie_pacse";

export interface HouseholdInput {
  maritalStatus: MaritalStatus;
  /** Children counted fully (resident with the household). */
  children: number;
  /** Children in shared custody (garde alternée) — quarter/half parts. */
  childrenGardeAlternee: number;
}

export interface IrInput {
  household: HouseholdInput;
  /** Taxable salary income BEFORE the 10% deduction / frais réels. */
  salaryTaxable: number;
  /** Actual professional expenses; when > standard deduction they replace it. */
  fraisReels?: number;
  /** Net property income (already after micro-foncier 30% or real regime). */
  revenusFonciers?: number;
  /** PER contributions paid during the year (deduction is capped). */
  versementsPER?: number;
  /** Donations to organisms helping people in need (75% then 66%). */
  dons?: number;
  /** Impatriate regime (art. 155 B): exempts 30% of the salary. */
  impatrie?: boolean;
}

export interface IrResult {
  parts: number;
  taxableIncome: number;
  /** Tax after family-quotient cap and décote, before donation reductions. */
  taxBeforeReductions: number;
  donationReduction: number;
  tax: number;
  /** Marginal rate of the household. */
  marginalRate: number;
  /** Average tax rate over taxable income (0 when no income). */
  averageRate: number;
  perDeduction: number;
}

/** Fiscal parts: 1 single / 2 couple; children 1-2 → 0.5 each, 3rd+ → 1.
 *  Shared custody children count half (0.25 / 0.5). Children in shared
 *  custody rank AFTER fully-resident children for the 3rd-child rule. */
export function fiscalParts(h: HouseholdInput): number {
  const base = h.maritalStatus === "marie_pacse" ? 2 : 1;
  let parts = base;
  let rank = 0;
  for (let i = 0; i < h.children; i++) {
    rank += 1;
    parts += rank <= 2 ? 0.5 : 1;
  }
  for (let i = 0; i < h.childrenGardeAlternee; i++) {
    rank += 1;
    parts += rank <= 2 ? 0.25 : 0.5;
  }
  return parts;
}

/** Family-quotient cap for the additional parts beyond the base 1 or 2. */
function quotientCap(h: HouseholdInput): number {
  let cap = 0;
  let rank = 0;
  for (let i = 0; i < h.children; i++) {
    rank += 1;
    cap += rank <= 2 ? PLAFOND_DEMI_PART_2026 : PLAFOND_DEMI_PART_2026 * 2;
  }
  for (let i = 0; i < h.childrenGardeAlternee; i++) {
    rank += 1;
    cap += rank <= 2 ? PLAFOND_QUART_PART_2026 : PLAFOND_DEMI_PART_2026;
  }
  return cap;
}

/** Progressive schedule applied to one quotient share. Returns cents-precise euros. */
export function taxPerPart(quotient: number): number {
  let tax = 0;
  let lower = 0;
  for (const { upTo, rate } of BAREME_IR_2026.brackets) {
    if (quotient <= lower) break;
    const slice = Math.min(quotient, upTo) - lower;
    tax += slice * rate;
    lower = upTo;
  }
  return tax;
}

export function marginalRate(quotient: number): number {
  let rate = 0;
  let lower = 0;
  for (const bracket of BAREME_IR_2026.brackets) {
    if (quotient > lower) rate = bracket.rate;
    lower = bracket.upTo;
  }
  return rate;
}

/** Standard 10% deduction (floored/capped) or frais réels when higher. */
export function salaryAfterExpenses(salaryTaxable: number, fraisReels?: number): number {
  if (salaryTaxable <= 0) return 0;
  const standard = Math.min(
    Math.max(salaryTaxable * ABATTEMENT_10_2026.rate, ABATTEMENT_10_2026.min),
    ABATTEMENT_10_2026.max,
  );
  const deduction = fraisReels && fraisReels > standard ? fraisReels : standard;
  return Math.max(salaryTaxable - deduction, 0);
}

export function perDeduction(versements: number, netProfessionalIncome: number): number {
  if (versements <= 0) return 0;
  const ceiling = Math.min(
    Math.max(netProfessionalIncome * PER_2026.rate, PER_2026.floor),
    PER_2026.max,
  );
  return Math.min(versements, ceiling);
}

export function computeIr(input: IrInput): IrResult {
  const h = input.household;
  const parts = fiscalParts(h);
  const baseParts = h.maritalStatus === "marie_pacse" ? 2 : 1;

  const salaryBase = input.impatrie
    ? input.salaryTaxable * (1 - IMPATRIE_EXEMPTION_RATE)
    : input.salaryTaxable;
  const netSalary = salaryAfterExpenses(salaryBase, input.fraisReels);
  const per = perDeduction(input.versementsPER ?? 0, netSalary);
  const taxableIncome = Math.max(netSalary + (input.revenusFonciers ?? 0) - per, 0);

  // Family-quotient cap: tax with full parts cannot beat tax with base parts
  // minus the legal cap on the advantage.
  const taxFull = parts * taxPerPart(taxableIncome / parts);
  const taxBase = baseParts * taxPerPart(taxableIncome / baseParts);
  const advantage = taxBase - taxFull;
  const cap = quotientCap(h);
  let grossTax = advantage > cap ? taxBase - cap : taxFull;

  // Décote
  const decote = h.maritalStatus === "marie_pacse" ? DECOTE_2026.couple : DECOTE_2026.single;
  if (grossTax > 0 && grossTax < decote.threshold) {
    grossTax = Math.max(grossTax - Math.max(decote.base - DECOTE_2026.rate * grossTax, 0), 0);
  }

  // Donation reductions: 75% up to 1 000 €, then 66% (within 20% of income).
  const dons = Math.min(input.dons ?? 0, taxableIncome * DONS_2026.capShareOfIncome);
  const dons75 = Math.min(dons, DONS_2026.cap75);
  const dons66 = Math.max(dons - dons75, 0);
  const donationReduction = Math.min(
    dons75 * DONS_2026.rate75 + dons66 * DONS_2026.rate66,
    grossTax,
  );

  const tax = Math.round(Math.max(grossTax - donationReduction, 0));
  return {
    parts,
    taxableIncome: Math.round(taxableIncome),
    taxBeforeReductions: Math.round(grossTax),
    donationReduction: Math.round(donationReduction),
    tax,
    marginalRate: marginalRate(taxableIncome / parts),
    averageRate: taxableIncome > 0 ? tax / taxableIncome : 0,
    perDeduction: Math.round(per),
  };
}
