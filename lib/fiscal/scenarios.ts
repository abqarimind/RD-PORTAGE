/**
 * Three-scenario comparison — the simulator's signature output:
 * A. current declared status, B. RD portage without optimisation,
 * C. RD portage optimised (NDF + May + PER + frais réels).
 * "Vous laissez X €/an sur la table" = C.disposable − A.disposable.
 *
 * All scenarios are ANNUAL and use simplified, documented assumptions
 * (see AUDIT.md §3) — the output is indicative, never tax advice.
 */
import { MARKET_AVG_MANAGEMENT_FEE, MAY_2026, MICRO_BNC_2026, RD_PORTAGE_2026 } from "./constants";
import { computeIr, type HouseholdInput, type IrInput } from "./ir";
import { computePortage } from "./portage";

export type CurrentStatus = "salarie_esn" | "freelance_micro" | "freelance_sasu" | "porte_ailleurs" | "transition";

export interface SimulationInput {
  status: CurrentStatus;
  /** Daily rate (freelance/portage) — for salaried, monthly gross salary. */
  tjmOrMonthlyGross: number;
  /** Invoiced days per year (ignored for salaried). */
  daysPerYear: number;
  household: HouseholdInput;
  /** Optimisation levers (scenario C). */
  fraisReelsAnnual?: number;
  versementsPER?: number;
  dons?: number;
  revenusFonciers?: number;
  impatrie?: boolean;
}

export interface ScenarioResult {
  id: "actuel" | "portage_rd" | "portage_rd_optimise";
  label: string;
  grossInflow: number;
  netPerceived: number;
  benefits: number;
  tax: number;
  /** Net + benefits − household income tax. */
  disposable: number;
  averageTaxRate: number;
  marginalRate: number;
  details: Record<string, number>;
}

export interface SimulationResult {
  scenarios: ScenarioResult[];
  /** The signature figure: optimised RD portage vs current status. */
  economieAnnuelleEur: number;
  /** Quick-range output for the flash diagnostic (±15%). */
  economieRange: { low: number; high: number };
}

/** Salaried: net paid ≈ 78.5% of gross, taxable ≈ 81.35% of gross (cadre).
 *  Documented approximation — see AUDIT.md §3. */
const SALARIE = { netRate: 0.785, taxableRate: 0.8135 };

/** SASU (assimilé salarié president): accounting overhead then ≈45% employer /
 *  ≈25% employee blended contributions. Documented approximation. */
const SASU = { overhead: 2_500, employerRate: 0.45, employeeRate: 0.25, taxableUplift: 1.03 };

function irFor(input: SimulationInput, salaryTaxable: number, optimised: boolean) {
  const irInput: IrInput = {
    household: input.household,
    salaryTaxable,
    revenusFonciers: input.revenusFonciers,
    impatrie: input.impatrie,
    ...(optimised
      ? { fraisReels: input.fraisReelsAnnual, versementsPER: input.versementsPER, dons: input.dons }
      : {}),
  };
  return computeIr(irInput);
}

function currentScenario(input: SimulationInput): ScenarioResult {
  const h = input.household;
  let gross = 0;
  let netPerceived = 0;
  let taxable = 0;
  const details: Record<string, number> = {};

  switch (input.status) {
    case "salarie_esn": {
      gross = input.tjmOrMonthlyGross * 12;
      netPerceived = gross * SALARIE.netRate;
      taxable = gross * SALARIE.taxableRate;
      details.salaireBrutAnnuel = Math.round(gross);
      break;
    }
    case "freelance_micro": {
      gross = input.tjmOrMonthlyGross * input.daysPerYear;
      const cotisations = gross * MICRO_BNC_2026.cotisations;
      netPerceived = gross - cotisations;
      taxable = gross * (1 - MICRO_BNC_2026.abattement);
      details.cotisationsSociales = Math.round(cotisations);
      break;
    }
    case "freelance_sasu": {
      gross = input.tjmOrMonthlyGross * input.daysPerYear;
      const envelope = Math.max(gross - SASU.overhead, 0);
      const brut = envelope / (1 + SASU.employerRate);
      netPerceived = brut * (1 - SASU.employeeRate);
      taxable = netPerceived * SASU.taxableUplift;
      details.fraisComptables = SASU.overhead;
      details.salaireBrutAnnuel = Math.round(brut);
      break;
    }
    case "porte_ailleurs": {
      // Same portage mechanics with the market-average 8% management fee,
      // no May wallet, no meal vouchers (worst observed configurations).
      gross = input.tjmOrMonthlyGross * input.daysPerYear;
      const fee = gross * MARKET_AVG_MANAGEMENT_FEE;
      const insurance = gross * RD_PORTAGE_2026.insuranceTaxRate;
      const available = gross - fee - insurance;
      const brut = available / (1 + RD_PORTAGE_2026.employerRate);
      netPerceived = brut * (1 - RD_PORTAGE_2026.employeeRate);
      taxable = netPerceived + brut * RD_PORTAGE_2026.csgNonDeductibleRate;
      details.fraisGestionConcurrent = Math.round(fee);
      break;
    }
    case "transition": {
      // Between two missions: baseline = future revenue handled as micro,
      // the most common "default" first status.
      gross = input.tjmOrMonthlyGross * input.daysPerYear;
      const cotisations = gross * MICRO_BNC_2026.cotisations;
      netPerceived = gross - cotisations;
      taxable = gross * (1 - MICRO_BNC_2026.abattement);
      break;
    }
  }

  // Current status: standard 10% deduction, no optimisation levers.
  const ir = computeIr({ household: h, salaryTaxable: taxable, revenusFonciers: input.revenusFonciers });
  return {
    id: "actuel",
    label: "Votre statut actuel",
    grossInflow: Math.round(gross),
    netPerceived: Math.round(netPerceived),
    benefits: 0,
    tax: ir.tax,
    disposable: Math.round(netPerceived - ir.tax),
    averageTaxRate: ir.averageRate,
    marginalRate: ir.marginalRate,
    details,
  };
}

function portageScenario(input: SimulationInput, optimised: boolean): ScenarioResult {
  const annualFees =
    input.status === "salarie_esn"
      ? // ESN consultants moving to freelance: estimate TJM from gross salary
        // (common rule of thumb: TJM ≈ monthly gross / 13.3 working value) —
        // here we keep their billing potential = salary cost × 1.25.
        input.tjmOrMonthlyGross * 12 * 1.25
      : input.tjmOrMonthlyGross * input.daysPerYear;
  const days = input.status === "salarie_esn" ? 215 : input.daysPerYear;

  const ndf = optimised ? Math.min(input.fraisReelsAnnual ?? 0, annualFees * RD_PORTAGE_2026.ndfCapShareOfFees) : 0;
  const cagnotte = optimised ? Math.min(MAY_2026.referenceMonthlyAmount * 12, annualFees * 0.2) : 0;

  const p = computePortage({
    tjm: annualFees / Math.max(days, 1),
    days,
    ndf,
    cagnotteMay: cagnotte,
    mealVouchers: optimised,
  });

  const ir = irFor(input, p.netTaxable, optimised);
  const netPerceived = p.netWithExpenses + p.mealVoucherCredit;
  return {
    id: optimised ? "portage_rd_optimise" : "portage_rd",
    label: optimised ? "Portage RD optimisé" : "Portage RD sans optimisation",
    grossInflow: p.fees,
    netPerceived: Math.round(netPerceived),
    benefits: p.cagnotteMay,
    tax: ir.tax,
    disposable: Math.round(netPerceived + p.cagnotteMay - ir.tax),
    averageTaxRate: ir.averageRate,
    marginalRate: ir.marginalRate,
    details: {
      fraisGestion: p.managementFee,
      assurancesTaxes: p.insuranceTax,
      salaireBrutAnnuel: p.grossSalary,
      ndf: p.ndf,
      cagnotteMay: p.cagnotteMay,
      perDeduit: ir.perDeduction,
    },
  };
}

export function simulate(input: SimulationInput): SimulationResult {
  const actuel = currentScenario(input);
  const portage = portageScenario(input, false);
  const optimise = portageScenario(input, true);
  const economie = Math.max(optimise.disposable - actuel.disposable, 0);
  return {
    scenarios: [actuel, portage, optimise],
    economieAnnuelleEur: economie,
    economieRange: { low: Math.round(economie * 0.85), high: Math.round(economie * 1.15) },
  };
}
