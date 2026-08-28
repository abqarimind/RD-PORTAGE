import { describe, expect, it } from "vitest";
import { cagnotteNet } from "@/config/fiscal-2026";
import { simulate, type SimulationInput } from "../scenarios";

describe("cagnotteNet — net of service fees", () => {
  it("May is at face value (no service fee in the reference case)", () => {
    expect(cagnotteNet("may", 1_570)).toBe(1_570);
  });

  it("Wawashi nets the 3.5% + 60 €/an service fees", () => {
    // 1 500 × (1 − 0.035) − 60/12 = 1 447.5 − 5 = 1 442.5
    expect(cagnotteNet("wawashi", 1_500)).toBeCloseTo(1_442.5, 1);
  });

  it("none returns zero", () => {
    expect(cagnotteNet("aucune", 1_570)).toBe(0);
  });
});

describe("simulate — cagnotte choice flows into scenario C", () => {
  const base: SimulationInput = {
    status: "freelance_micro",
    tjmOrMonthlyGross: 500,
    daysPerYear: 220,
    household: { maritalStatus: "celibataire", children: 0, childrenGardeAlternee: 0 },
  };

  it("May ≥ Wawashi ≥ none on optimised disposable income", () => {
    const may = simulate({ ...base, cagnotteChoice: "may", cagnotteMonthly: 1_570 }).scenarios[2].disposable;
    const wawashi = simulate({ ...base, cagnotteChoice: "wawashi", cagnotteMonthly: 1_500 }).scenarios[2].disposable;
    const none = simulate({ ...base, cagnotteChoice: "aucune" }).scenarios[2].disposable;
    expect(may).toBeGreaterThanOrEqual(wawashi);
    expect(wawashi).toBeGreaterThan(none);
  });
});
