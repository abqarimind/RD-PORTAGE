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
  /** May benefits wallet funding for the month ("cagnotte"). */
  cagnotteMay?: number;
  /** Dematerialised meal vouchers (Swile). */
  mealVouchers?: boolean;
}

export interface PortageResult {
  fees: number;
  managementFee: number;
  insuranceTax: number;
  ndf: number;
  cagnotteMay: number;
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
  /** globalCompensation / fees. */
  restitutionRate: number;
  /** Taxable net (net + non-deductible CSG/CRDS) — feeds the IR engine. */
  netTaxable: number;
}

export function computePortage(input: PortageInput): PortageResult {
  const c = RD_PORTAGE_2026;
  const fees = input.tjm * input.days;
  const managementFee = fees * c.managementFeeRate;
  const insuranceTax = fees * c.insuranceTaxRate;
  // NDF refunds are capped at 30% of the month's invoiced fees (frais guide).
  const ndf = Math.min(input.ndf ?? 0, fees * c.ndfCapShareOfFees);
  const cagnotteMay = input.cagnotteMay ?? 0;

  const mealVoucherTotal = input.mealVouchers ? input.days * c.mealVoucher.dailyValue : 0;
  const mealVoucherEmployee = mealVoucherTotal * c.mealVoucher.employeeShare;

  // The activity account funds gross salary + employer contributions.
  // NOTE: like the reference workbook, the employer share of meal vouchers is
  // carried in the "coût chargé" line, not deducted from the available
  // account — see AUDIT.md §2.3.
  const available = Math.max(fees - managementFee - insuranceTax - ndf - cagnotteMay, 0);
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
    netTaxable: r(netSalary + grossSalary * c.csgNonDeductibleRate),
  };
}

const r = (n: number) => Math.round(n);
