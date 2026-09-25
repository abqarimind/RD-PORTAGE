import { describe, expect, it } from "vitest";
import { CAGNOTTE_PROVIDERS, cagnotteNet } from "@/config/fiscal-2026";
import { simulate, type SimulationInput } from "../scenarios";

describe("cagnotteNet — net of service fees", () => {
  it("May : 1 568,50 € prélevés = 1 500 € utilisables + 68,50 € d'abonnement (#5)", () => {
    expect(CAGNOTTE_PROVIDERS.may.defaultMonthly).toBe(1_568.5);
    expect(cagnotteNet("may", CAGNOTTE_PROVIDERS.may.defaultMonthly)).toBeCloseTo(1_500, 2);
  });

  it("Wawashi : 18 000 €/an utilisables, frais (3,5 % + 60 €/an) en sus (#6)", () => {
    expect(cagnotteNet("wawashi", CAGNOTTE_PROVIDERS.wawashi.defaultMonthly) * 12).toBeCloseTo(18_000, 0);
    // Formule des frais inchangée : 1 500 × (1 − 0,035) − 60/12 = 1 442,5.
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

  // Avec les chiffres du 25/09, May (68,50 €/mois d'abonnement) coûte un peu
  // plus que Wawashi (3,5 % + 60 €/an) pour les mêmes 1 500 € utilisables :
  // l'ordre May ≥ Wawashi ne tient plus. Seule certitude : une cagnotte bat
  // l'absence de cagnotte.
  it("une cagnotte (May ou Wawashi) bat l'absence de cagnotte", () => {
    const may = simulate({ ...base, cagnotteChoice: "may", cagnotteMonthly: CAGNOTTE_PROVIDERS.may.defaultMonthly }).scenarios[2].disposable;
    const wawashi = simulate({ ...base, cagnotteChoice: "wawashi", cagnotteMonthly: CAGNOTTE_PROVIDERS.wawashi.defaultMonthly }).scenarios[2].disposable;
    const none = simulate({ ...base, cagnotteChoice: "aucune" }).scenarios[2].disposable;
    expect(may).toBeGreaterThan(none);
    expect(wawashi).toBeGreaterThan(none);
  });
});
