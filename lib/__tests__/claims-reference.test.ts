/** Le chiffre affiché dans claims.ts doit rester celui que calcule le moteur (#5, #28). */
import { describe, expect, it } from "vitest";
import { CAGNOTTE_PROVIDERS } from "@/config/fiscal-2026";
import { CLAIMS } from "@/content/claims";
import { computePortage } from "@/lib/fiscal/portage";

describe("cas de référence TJM 420 €", () => {
  const r = computePortage({
    tjm: 420,
    days: 20,
    ndf: 500,
    cagnotteMay: CAGNOTTE_PROVIDERS.may.usableMonthly,
    cagnotteCost: CAGNOTTE_PROVIDERS.may.defaultMonthly,
    mealVouchers: true,
  });
  it("63 % restitués avant impôt, dont 21 % en avantages", () => {
    expect(Math.round(r.restitutionRate * 100)).toBe(63);
    expect(Math.round(r.benefitsRate * 100)).toBe(21);
    expect(CLAIMS.restitution_64.value).toBe("63 %");
    expect(CLAIMS.restitution_64.text).toContain("dont 21 %");
  });
});
