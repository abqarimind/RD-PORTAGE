/**
 * Retours qualité de l'équipe RD Portage du 25/09 — règles de calcul.
 * Les numéros renvoient au tableau « points à remonter (à jour 23-09) ».
 */
import { describe, expect, it } from "vitest";
import { CAGNOTTE_PROVIDERS, RD_PORTAGE_2026 } from "@/config/fiscal-2026";
import { computePortage } from "@/lib/fiscal/portage";
import { simulate } from "@/lib/fiscal/scenarios";
import { buildSimInput, computeLive } from "@/lib/simulateur/live";
import { DEFAULT_FORM, type FormState } from "@/lib/simulateur/state";

const MAY = CAGNOTTE_PROVIDERS.may;
const k = RD_PORTAGE_2026.ndfCapShareOfGross;

describe("#4 / #42 — frais pro limités à 30 % du salaire brut", () => {
  it("cas du tableau (#24) : 1 715 € saisis → plafond d'environ 1 420 €", () => {
    const p = computePortage({ tjm: 520, days: 20, ndf: 1_715, cagnotteMay: 1_500, cagnotteCost: MAY.defaultMonthly, mealVouchers: true });
    expect(p.ndf).toBeGreaterThan(1_400);
    expect(p.ndf).toBeLessThan(1_440);
  });

  it("au plafond, les NDF valent exactement 30 % du brut obtenu (forme fermée, sans itération)", () => {
    const p = computePortage({ tjm: 520, days: 20, ndf: 99_999, cagnotteMay: 1_500, cagnotteCost: MAY.defaultMonthly });
    expect(Math.abs(p.ndf - k * p.grossSalary)).toBeLessThanOrEqual(1);
  });

  it("cas de référence (TJM 420 €, 20 j, NDF 500 €) : sous le plafond, les 500 € passent en entier", () => {
    const p = computePortage({ tjm: 420, days: 20, ndf: 500, cagnotteMay: 1_500, cagnotteCost: MAY.defaultMonthly, mealVouchers: true });
    expect(p.ndf).toBe(500);
    expect(p.ndf).toBeLessThanOrEqual(k * p.grossSalary);
  });

  it("la cagnotte May s'ajoute EN PLUS : elle n'entre pas dans les 30 %", () => {
    const p = computePortage({ tjm: 520, days: 20, ndf: 99_999, cagnotteMay: 1_500, cagnotteCost: MAY.defaultMonthly });
    // Si la cagnotte comptait dans les 30 %, ndf + cagnotte ≤ 30 % du brut.
    expect(p.ndf + p.cagnotteMay).toBeGreaterThan(k * p.grossSalary);
    expect(Math.abs(p.ndf - k * p.grossSalary)).toBeLessThanOrEqual(1);
  });
});

describe("#5 — cagnotte May : 1 500 € utilisables + 68,50 € d'abonnement", () => {
  it("l'enveloppe perd 1 568,50 €, le consultant reçoit 1 500 €", () => {
    const p = computePortage({ tjm: 420, days: 20, cagnotteMay: 1_500, cagnotteCost: MAY.defaultMonthly });
    const sans = computePortage({ tjm: 420, days: 20 });
    expect(Math.abs(sans.available - p.available - 1_568.5)).toBeLessThanOrEqual(1); // arrondis à l'euro
    expect(p.cagnotteMay).toBe(1_500);
  });
});

const form = (patch: Partial<FormState>): FormState =>
  ({ ...DEFAULT_FORM, status: "freelance_micro", tjmMode: "exact", tjmExact: 520, days: 20, ...patch }) as FormState;

describe("#1 / #11 — les frais saisis à l'étape Activité changent le résultat", () => {
  it("résultat avec 1 715 € ≠ résultat avec 0 €", () => {
    const avec = simulate(buildSimInput(form({ fraisMensuels: 1_715 }), 520, "freelance_micro"));
    const sans = simulate(buildSimInput(form({ fraisMensuels: 0 }), 520, "freelance_micro"));
    expect(avec.scenarios[2].disposable).not.toBe(sans.scenarios[2].disposable);
    expect(avec.economieAnnuelleEur).not.toBe(sans.economieAnnuelleEur);
  });

  it("les « frais réels » de l'étape Foyer ne sont plus pris pour des NDF", () => {
    const f = form({ fraisMensuels: 0, useFraisReels: true, fraisReels: 20_000 });
    const r = simulate(buildSimInput(f, 520, "freelance_micro"));
    expect(r.scenarios[2].details.ndf).toBe(0);
  });
});

describe("#3 — l'aperçu plafonne la cagnotte à 20 % du CA, comme le résultat", () => {
  it("petit CA (150 € × 2 j) : plus de 527 % du CA restitué", () => {
    const live = computeLive(form({ tjmExact: 150, days: 2, cagnotte: "may", titresResto: false }), 150);
    expect(live.cagnotteMay).toBeLessThanOrEqual(300 * 0.2);
    expect(live.restitutionRate).toBeLessThan(1);
  });
});

describe("#28 — le taux de restitution dit quelle part est en avantages", () => {
  it("part en avantages = (cagnotte + titres-restaurant) / CA", () => {
    const live = computeLive(form({ cagnotte: "may", titresResto: true }), 520);
    expect(live.benefitsRate).toBeCloseTo((live.cagnotteMay + live.mealVoucherCredit) / live.fees, 2);
    expect(live.benefitsRate).toBeLessThan(live.restitutionRate);
  });
});
