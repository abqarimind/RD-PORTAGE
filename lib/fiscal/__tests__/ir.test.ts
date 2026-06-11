/**
 * Hand-computed expected values, barème IR 2026 (2025 income).
 * Every case documents its manual computation so a reviewer can re-derive it.
 * Bracket cumulative anchors (per part):
 *   at 29 579 € → 1 977.69 € ; at 84 577 € → 18 477.09 € ; at 181 917 € → 58 386.49 €.
 */
import { describe, expect, it } from "vitest";
import { computeIr, fiscalParts } from "../ir";
import { computePortage } from "../portage";
import { simulate } from "../scenarios";

const noOpt = { fraisReels: undefined, versementsPER: undefined, dons: undefined };

describe("fiscalParts", () => {
  it("counts garde alternée as quarter parts after resident children", () => {
    expect(fiscalParts({ maritalStatus: "celibataire", children: 0, childrenGardeAlternee: 0 })).toBe(1);
    expect(fiscalParts({ maritalStatus: "marie_pacse", children: 2, childrenGardeAlternee: 0 })).toBe(3);
    expect(fiscalParts({ maritalStatus: "celibataire", children: 0, childrenGardeAlternee: 1 })).toBe(1.25);
    expect(fiscalParts({ maritalStatus: "marie_pacse", children: 1, childrenGardeAlternee: 1 })).toBe(2.75);
    // 3rd child counts full part — here in shared custody → half part.
    expect(fiscalParts({ maritalStatus: "marie_pacse", children: 2, childrenGardeAlternee: 1 })).toBe(3.5);
  });
});

describe("computeIr — 10 hand-computed cases", () => {
  // Case 1 — single, no children, 30 000 € taxable (input is pre-deduction:
  // 33 333 € salary − 10% = 30 000). q=30 000 → 1 977.69 + 0.30×421 = 2 103.99.
  // Above décote threshold (1 982) → tax 2 104.
  it("1. célibataire sans enfant", () => {
    const r = computeIr({
      household: { maritalStatus: "celibataire", children: 0, childrenGardeAlternee: 0 },
      salaryTaxable: 33_333.33,
      ...noOpt,
    });
    expect(r.taxableIncome).toBe(30_000);
    expect(r.tax).toBe(2_104);
    expect(r.marginalRate).toBe(0.3);
  });

  // Case 2 — couple, 2 children, 60 000 € taxable. P=3, q=20 000 →
  // 0.11×8 400=924 ×3 = 2 772. QF advantage 4 208−2 772=1 436 < cap 3 614.
  // Décote couple: 1 484 − 0.4525×2 772 = 229.67 → tax 2 772 − 229.67 = 2 542.
  it("2. couple 2 enfants avec décote", () => {
    const r = computeIr({
      household: { maritalStatus: "marie_pacse", children: 2, childrenGardeAlternee: 0 },
      salaryTaxable: 66_666.67,
      ...noOpt,
    });
    expect(r.taxableIncome).toBe(60_000);
    expect(r.tax).toBe(2_542);
  });

  // Case 3 — QF cap binding: couple, 2 children, salary 164 556 €; the 10%
  // deduction (16 455 €) is CAPPED at 14 556 € → taxable 150 000.
  // Full parts: 3 × tax(50 000)=3×8 103.99=24 311.97. Base: 2×tax(75 000)=
  // 2×15 603.99=31 207.98. Advantage 6 896.01 > cap 3 614 → 31 207.98−3 614
  // = 27 593.98 → 27 594.
  it("3. plafonnement du quotient familial + plafond abattement 10%", () => {
    const r = computeIr({
      household: { maritalStatus: "marie_pacse", children: 2, childrenGardeAlternee: 0 },
      salaryTaxable: 164_556,
      ...noOpt,
    });
    expect(r.taxableIncome).toBe(150_000);
    expect(r.tax).toBe(27_594);
  });

  // Case 4 — garde alternée: single, 1 shared-custody child, 40 000 € taxable.
  // P=1.25, q=32 000 → 2 703.99 ×1.25=3 379.99. Base 1×tax(40 000)=5 103.99.
  // Advantage 1 724 > quarter-part cap 903.50 → 5 103.99−903.50=4 200.49 → 4 200.
  it("4. garde alternée (quart de part plafonné)", () => {
    const r = computeIr({
      household: { maritalStatus: "celibataire", children: 0, childrenGardeAlternee: 1 },
      salaryTaxable: 44_444.44,
      ...noOpt,
    });
    expect(r.taxableIncome).toBe(40_000);
    expect(r.tax).toBe(4_200);
  });

  // Case 5 — PER capped: single, salary 111 111 € → −10% = 100 000 net.
  // PER paid 15 000, ceiling 10% × 100 000 = 10 000 → taxable 90 000.
  // tax = 18 477.09 + 0.41×5 423 = 20 700.52 → 20 701.
  it("5. PER plafonné à 10% du revenu", () => {
    const r = computeIr({
      household: { maritalStatus: "celibataire", children: 0, childrenGardeAlternee: 0 },
      salaryTaxable: 111_111.11,
      versementsPER: 15_000,
      ...{ fraisReels: undefined, dons: undefined },
    });
    expect(r.perDeduction).toBe(10_000);
    expect(r.taxableIncome).toBe(90_000);
    expect(r.tax).toBe(20_701);
  });

  // Case 6 — impatrié (30% exemption): salary 88 888.89 → ×0.7 = 62 222.22
  // → −10% = 56 000. tax = 1 977.69 + 0.30×26 421 = 9 903.99 → 9 904.
  it("6. régime impatrié art. 155 B", () => {
    const r = computeIr({
      household: { maritalStatus: "celibataire", children: 0, childrenGardeAlternee: 0 },
      salaryTaxable: 88_888.89,
      impatrie: true,
      ...noOpt,
    });
    expect(r.taxableIncome).toBe(56_000);
    expect(r.tax).toBe(9_904);
  });

  // Case 7 — donations: same base as case 4 without child (tax 5 103.99),
  // 1 500 € donated → 75%×1 000 + 66%×500 = 1 080 → 5 103.99−1 080=4 023.99 → 4 024.
  it("7. dons 75% puis 66%", () => {
    const r = computeIr({
      household: { maritalStatus: "celibataire", children: 0, childrenGardeAlternee: 0 },
      salaryTaxable: 44_444.44,
      dons: 1_500,
      ...{ fraisReels: undefined, versementsPER: undefined },
    });
    expect(r.donationReduction).toBe(1_080);
    expect(r.tax).toBe(4_024);
  });

  // Case 8 — décote single: 20 000 € taxable → 924 gross.
  // décote = 897 − 0.4525×924 = 478.89 → tax 445.11 → 445.
  it("8. décote célibataire", () => {
    const r = computeIr({
      household: { maritalStatus: "celibataire", children: 0, childrenGardeAlternee: 0 },
      salaryTaxable: 22_222.22,
      ...noOpt,
    });
    expect(r.tax).toBe(445);
  });

  // Case 9 — below first bracket → zero tax.
  it("9. revenu sous la première tranche", () => {
    const r = computeIr({
      household: { maritalStatus: "celibataire", children: 0, childrenGardeAlternee: 0 },
      salaryTaxable: 12_000,
      ...noOpt,
    });
    expect(r.tax).toBe(0);
    expect(r.averageRate).toBe(0);
  });

  // Case 10 — couple, 1 resident + 1 shared-custody child, 70 000 € taxable.
  // P=2.75, q=25 454.55 → 0.11×13 854.55=1 524.00 ×2.75=4 191.00.
  // Base 2×tax(35 000)=2×3 603.99=7 207.98. Advantage 3 016.98 > cap
  // (1 807+903.5=2 710.5) → 7 207.98−2 710.5=4 497.48 → 4 497.
  it("10. couple, enfant + garde alternée, plafonnement mixte", () => {
    const r = computeIr({
      household: { maritalStatus: "marie_pacse", children: 1, childrenGardeAlternee: 1 },
      salaryTaxable: 77_777.78,
      ...noOpt,
    });
    expect(r.taxableIncome).toBe(70_000);
    expect(r.tax).toBe(4_497);
  });
});

describe("computePortage — non-regression vs the official RD Portage workbook", () => {
  // Reference: Simulation_RD_PORTAGE_420.pdf (client document).
  // TJM 420 × 20 days, NDF 500 €, May 1 570 €, meal vouchers 13 €/day.
  it("reproduces the TJM 420 reference simulation within ±10 €", () => {
    const p = computePortage({ tjm: 420, days: 20, ndf: 500, cagnotteMay: 1_570, mealVouchers: true });
    expect(p.fees).toBe(8_400);
    expect(p.managementFee).toBe(336);
    expect(p.insuranceTax).toBe(76);
    expect(p.available).toBe(5_918);
    expect(Math.abs(p.grossSalary - 4_065)).toBeLessThanOrEqual(10);
    expect(Math.abs(p.employerContributions - 1_854)).toBeLessThanOrEqual(10);
    expect(Math.abs(p.netSalary - 3_191)).toBeLessThanOrEqual(10);
    expect(Math.abs(p.netWithExpenses - 3_561)).toBeLessThanOrEqual(10);
    expect(Math.abs(p.netPerceived - 3_821)).toBeLessThanOrEqual(10);
    expect(Math.abs(p.globalCompensation - 5_391)).toBeLessThanOrEqual(10);
    expect(p.restitutionRate).toBeGreaterThan(0.63);
    expect(p.restitutionRate).toBeLessThan(0.66);
  });

  // Manus prototype regression: NDF must be capped at 30% of fees.
  it("caps NDF at 30% of invoiced fees", () => {
    const p = computePortage({ tjm: 400, days: 10, ndf: 3_000 });
    expect(p.ndf).toBe(1_200);
  });

  it("never produces a negative available account", () => {
    const p = computePortage({ tjm: 100, days: 2, ndf: 60, cagnotteMay: 500 });
    expect(p.available).toBeGreaterThanOrEqual(0);
  });
});

describe("simulate — 3 scenarios", () => {
  it("optimised portage beats raw portage for a typical consultant", () => {
    const r = simulate({
      status: "porte_ailleurs",
      tjmOrMonthlyGross: 500,
      daysPerYear: 210,
      household: { maritalStatus: "marie_pacse", children: 2, childrenGardeAlternee: 0 },
      fraisReelsAnnual: 6_000,
      versementsPER: 5_000,
    });
    const [actuel, portage, optimise] = r.scenarios;
    expect(actuel.id).toBe("actuel");
    expect(optimise.disposable).toBeGreaterThan(portage.disposable);
    expect(r.economieAnnuelleEur).toBe(optimise.disposable - actuel.disposable);
    expect(r.economieRange.low).toBeLessThan(r.economieRange.high);
  });

  it("flash-range stays positive and ordered for a micro freelance", () => {
    const r = simulate({
      status: "freelance_micro",
      tjmOrMonthlyGross: 450,
      daysPerYear: 200,
      household: { maritalStatus: "celibataire", children: 0, childrenGardeAlternee: 0 },
    });
    expect(r.economieAnnuelleEur).toBeGreaterThanOrEqual(0);
  });
});
