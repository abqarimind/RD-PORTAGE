/**
 * Non-régression sur l'invariant anti-zéro (§4.2, §7.2).
 *
 * Une batterie d'entrées dégradées — champs vides, fourchettes, valeurs
 * aberrantes — ne doit JAMAIS produire un 0 € silencieux : soit le calcul est
 * possible et donne un résultat fini, soit il est refusé en nommant ce qui
 * manque et l'étape où le corriger.
 */
import { describe, expect, it } from "vitest";
import { checkPlausibility, validateInputs } from "@/lib/simulateur/guards";
import { buildAvantages } from "@/lib/simulateur/payload";
import { DEFAULT_FORM, resolvedTjm, type FormState } from "@/lib/simulateur/state";
import { computePortage } from "@/lib/fiscal/portage";
import { simulate } from "@/lib/fiscal/scenarios";
import { TJM_BRACKETS } from "@/lib/simulateur/brackets";

// Le profil n'a plus de défaut (§4.3) : ces cas testent les AUTRES entrées,
// on en fixe donc un explicitement. Son absence est testée à part.
const form = (patch: Partial<FormState> = {}): FormState => ({
  ...DEFAULT_FORM,
  status: "freelance_micro",
  ...patch,
});
const statusOf = (f: FormState) => f.status ?? "freelance_micro";

describe("entrées insuffisantes : refusées, jamais affichées à 0 €", () => {
  const cas: [string, FormState][] = [
    ["TJM exact à zéro", form({ tjmMode: "exact", tjmExact: 0 })],
    ["TJM exact négatif", form({ tjmMode: "exact", tjmExact: -100 })],
    ["TJM non fini", form({ tjmMode: "exact", tjmExact: Number.NaN })],
    ["zéro jour facturé", form({ days: 0 })],
    ["jours non finis", form({ days: Number.NaN })],
    ["frais réels choisis sans montant", form({ useFraisReels: true, fraisReels: 0 })],
  ];

  for (const [label, f] of cas) {
    it(`${label} → le calcul est refusé avec un message et une étape`, () => {
      const missing = validateInputs(f);
      expect(missing.length).toBeGreaterThan(0);
      for (const m of missing) {
        expect(m.message.length).toBeGreaterThan(0);
        expect(["activite", "foyer"]).toContain(m.step);
        expect(m.cta.length).toBeGreaterThan(0);
      }
    });
  }
});

describe("§4.3 — le profil n'a plus de valeur par défaut", () => {
  it("DEFAULT_FORM ne présélectionne aucun profil", () => {
    expect(DEFAULT_FORM.status).toBeNull();
  });

  it("un parcours sans profil est refusé et renvoie à l'étape Profil", () => {
    const missing = validateInputs({ ...DEFAULT_FORM });
    const profil = missing.find((m) => m.step === "profil");
    expect(profil).toBeDefined();
    expect(profil!.cta).toContain("profil");
  });

  it("le profil renseigné, le parcours par défaut redevient calculable", () => {
    expect(validateInputs(form())).toHaveLength(0);
  });
});

describe("entrées valides : un résultat fini, jamais NaN", () => {
  it("chaque fourchette produit un résultat calculable", () => {
    for (const b of TJM_BRACKETS) {
      const f = form({ tjmMode: "fourchette", tjmBracketId: b.id });
      expect(validateInputs(f)).toHaveLength(0);

      const tjm = resolvedTjm(f);
      const live = computePortage({ tjm, days: f.days, mealVouchers: f.titresResto });
      expect(live.netPerceived).toBeGreaterThan(0);

      const result = simulate({
        status: statusOf(f),
        tjmOrMonthlyGross: tjm,
        daysPerYear: f.days * 12,
        household: { maritalStatus: f.situation, children: f.enfants, childrenGardeAlternee: f.gardeAlternee },
      });
      expect(checkPlausibility(result, f)).toHaveLength(0);
    }
  });

  it("tous les profils produisent un résultat plausible à tous les paliers de TJM", () => {
    const profils = ["salarie_esn", "freelance_micro", "freelance_sasu", "porte_ailleurs", "transition"] as const;
    for (const status of profils) {
      for (const b of TJM_BRACKETS) {
        const f = form({ status, tjmMode: "fourchette", tjmBracketId: b.id });
        const tjm = resolvedTjm(f);
        const result = simulate({
          status,
          tjmOrMonthlyGross: status === "salarie_esn" ? Math.round((tjm * f.days) / 1.25) : tjm,
          daysPerYear: f.days * 12,
          household: { maritalStatus: f.situation, children: f.enfants, childrenGardeAlternee: f.gardeAlternee },
        });
        expect(checkPlausibility(result, f), `${status} / ${b.id}`).toHaveLength(0);
        expect(Number.isFinite(result.economieAnnuelleEur)).toBe(true);
      }
    }
  });

  it("un TJM nul ne fabrique plus de titres-restaurant venus de nulle part", () => {
    const live = computePortage({ tjm: 0, days: 20, mealVouchers: true });
    expect(live.netPerceived).toBe(0);
    expect(live.mealVoucherCredit).toBe(0);
  });
});

describe("BUG-04 — la mention « avantages inclus » suit la sélection réelle", () => {
  it("aucun avantage sélectionné → mention absente et total nul", () => {
    const a = buildAvantages(form({ cagnotte: "aucune", titresResto: false }), 0);
    expect(a.avantagesInclus).toBe(false);
    expect(a.selection).toHaveLength(0);
    expect(a.totalNetMensuel).toBe(0);
    expect(a.titresResto.inclus).toBe(false);
  });

  it("cagnotte seule, titres-restaurant seuls, ou les deux → mention cohérente", () => {
    expect(buildAvantages(form({ cagnotte: "may", titresResto: false }), 0).avantagesInclus).toBe(true);
    expect(buildAvantages(form({ cagnotte: "aucune", titresResto: true }), 130).avantagesInclus).toBe(true);
    const deux = buildAvantages(form({ cagnotte: "may", titresResto: true }), 130);
    expect(deux.selection).toHaveLength(2);
    expect(deux.totalNetMensuel).toBe(deux.selection.reduce((s, x) => s + x.montantNetMensuel, 0));
  });

  it("Wawashi est affichée NETTE de ses frais de service (60 €/an + 3,5 %)", () => {
    const a = buildAvantages(form({ cagnotte: "wawashi", titresResto: false }), 0);
    const w = a.selection[0];
    expect(w.label).toBe("Wawashi");
    // 1 500 × (1 − 3,5 %) − 60/12 = 1 442,5
    expect(w.montantNetMensuel).toBe(1_443);
    expect(w.montantNetMensuel).toBeLessThan(w.montantBrutMensuel);
    expect(w.fraisDeService).toContain("3,5");
  });

  it("toute combinaison de sélection reste cohérente entre libellé, liste et total", () => {
    for (const cagnotte of ["may", "wawashi", "aucune"] as const) {
      for (const titresResto of [true, false]) {
        const a = buildAvantages(form({ cagnotte, titresResto }), titresResto ? 130 : 0);
        expect(a.avantagesInclus).toBe(a.selection.length > 0);
        expect(a.totalNetMensuel).toBe(a.selection.reduce((s, x) => s + x.montantNetMensuel, 0));
        expect(a.totalNetAnnuel).toBe(a.totalNetMensuel * 12);
      }
    }
  });
});
