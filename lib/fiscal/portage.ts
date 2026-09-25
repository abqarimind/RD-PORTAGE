/**
 * RD Portage payroll model — monthly amounts, mirroring the official internal
 * simulation workbook (reference case: TJM 420 € × 20 days, see AUDIT.md).
 * This module replaces and fixes the Manus prototype's "TJM → net" brick;
 * the public TJM calculator behaviour is reproduced through computePortage
 * with options disabled.
 */
import { RD_PORTAGE_2026 } from "./constants";

export interface PortageInput {
  /** Daily rate excl. VAT. */
  tjm: number;
  /** Invoiced days in the month. */
  days: number;
  /** Professional expense refunds requested for the month (NDF). */
  ndf?: number;
  /** Benefits wallet VALUE for the consultant ("cagnotte", net of fees). */
  cagnotteMay?: number;
  /**
   * Wallet COST taken from the activity account (value + provider fees).
   * Defaults to cagnotteMay (provider without fees). Retour #5 : May coûte
   * 1 568,50 € (1 500 € utilisables + 68,50 € d'abonnement).
   */
  cagnotteCost?: number;
  /** Dematerialised meal vouchers (Swile). */
  mealVouchers?: boolean;
}

export interface PortageResult {
  fees: number;
  managementFee: number;
  insuranceTax: number;
  ndf: number;
  cagnotteMay: number;
  /** Wallet cost taken from the activity account. */
  cagnotteCost: number;
  /** NDF actually retained (after the 30 %-of-gross cap). */
  ndfCap: number;
  /** "Disponible compte consultant" funding gross salary + employer costs. */
  available: number;
  grossSalary: number;
  employerContributions: number;
  employeeContributions: number;
  /** Net salary before withholding tax, before NDF refund. */
  netSalary: number;
  /** Net + NDF refund − employee share of meal vouchers. */
  netWithExpenses: number;
  mealVoucherCredit: number;
  /** netWithExpenses + meal vouchers. */
  netPerceived: number;
  /** netPerceived + May wallet — "rémunération globale". */
  globalCompensation: number;
  /** globalCompensation / fees — AVANT impôt sur le revenu, avantages compris. */
  restitutionRate: number;
  /** Avantages non retirables en argent : titres-restaurant + cagnotte. */
  benefitsTotal: number;
  /** benefitsTotal / fees — la part du taux de restitution en avantages (#28). */
  benefitsRate: number;
  /** Net en poche, retirable en argent : netWithExpenses (#7). */
  cashNet: number;
  /** Taxable net (net + non-deductible CSG/CRDS) — feeds the IR engine. */
  netTaxable: number;
}

export function computePortage(input: PortageInput): PortageResult {
  const c = RD_PORTAGE_2026;
  const fees = input.tjm * input.days;
  const managementFee = fees * c.managementFeeRate;
  const insuranceTax = fees * c.insuranceTaxRate;
  const cagnotteMay = input.cagnotteMay ?? 0;
  const cagnotteCost = input.cagnotteCost ?? cagnotteMay;

  /*
   * NDF limitées à 30 % du SALAIRE BRUT (politique interne RD, #4/#42).
   * Le brut dépend lui-même des NDF :
   *   brut(ndf) = (B − ndf) / (1 + e),  B = CA − gestion − assurances − cagnotte
   * La contrainte ndf ≤ k · brut(ndf) est linéaire ; sa borne s'écrit en
   * forme fermée :  ndf ≤ k · B / (1 + e + k).  Aucune itération.
   * La cagnotte est déjà retirée de B : elle s'ajoute hors des 30 %.
   */
  const k = c.ndfCapShareOfGross;
  const base = Math.max(fees - managementFee - insuranceTax - cagnotteCost, 0);
  const ndfCap = (k * base) / (1 + c.employerRate + k);
  const ndf = Math.min(Math.max(input.ndf ?? 0, 0), ndfCap);

  // Garde anti-zéro (spec §4.2) : sans jour facturé ni honoraires, aucun
  // titre-restaurant n'est émis. Sans cette garde, un TJM à 0 produisait un
  // « net perçu » de 130 € sorti de nulle part.
  const mealVoucherTotal = input.mealVouchers && fees > 0 && input.days > 0 ? input.days * c.mealVoucher.dailyValue : 0;
  const mealVoucherEmployee = mealVoucherTotal * c.mealVoucher.employeeShare;

  // The activity account funds gross salary + employer contributions.
  // NOTE: like the reference workbook, the employer share of meal vouchers is
  // carried in the "coût chargé" line, not deducted from the available
  // account — see AUDIT.md §2.3.
  const available = Math.max(fees - managementFee - insuranceTax - ndf - cagnotteCost, 0);
  const grossSalary = available / (1 + c.employerRate);
  const employerContributions = grossSalary * c.employerRate;
  const employeeContributions = grossSalary * c.employeeRate;
  const netSalary = grossSalary - employeeContributions;
  const netWithExpenses = netSalary + ndf - mealVoucherEmployee;
  const netPerceived = netWithExpenses + mealVoucherTotal;
  const globalCompensation = netPerceived + cagnotteMay;

  return {
    fees: r(fees),
    managementFee: r(managementFee),
    insuranceTax: r(insuranceTax),
    ndf: r(ndf),
    cagnotteMay: r(cagnotteMay),
    cagnotteCost: r(cagnotteCost),
    ndfCap: r(ndfCap),
    available: r(available),
    grossSalary: r(grossSalary),
    employerContributions: r(employerContributions),
    employeeContributions: r(employeeContributions),
    netSalary: r(netSalary),
    netWithExpenses: r(netWithExpenses),
    mealVoucherCredit: r(mealVoucherTotal),
    netPerceived: r(netPerceived),
    globalCompensation: r(globalCompensation),
    restitutionRate: fees > 0 ? globalCompensation / fees : 0,
    benefitsTotal: r(mealVoucherTotal + cagnotteMay),
    benefitsRate: fees > 0 ? (mealVoucherTotal + cagnotteMay) / fees : 0,
    cashNet: r(netWithExpenses),
    netTaxable: r(netSalary + grossSalary * c.csgNonDeductibleRate),
  };
}

const r = (n: number) => Math.round(n);
