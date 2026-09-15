/**
 * Machine à états du simulateur (§7.2).
 *
 * Ce que ces tests verrouillent : toutes les transitions avant/arrière
 * préservent les données (BUG-01), le mode de saisie du TJM est réversible
 * sans perte (BUG-02), et « Nouvelle simulation » repart vraiment de zéro
 * (BUG-03).
 */
import { describe, expect, it } from "vitest";
import type { DiagnosticAnswers } from "@/lib/diagnostic/answers";
import {
  activeBracket,
  createInitialState,
  DEFAULT_FORM,
  reducer,
  resolvedTjm,
  STEPS,
  type SimulatorAction,
  type SimulatorState,
} from "@/lib/simulateur/state";

const initial = () => createInitialState("sim-test");
const apply = (state: SimulatorState, ...actions: SimulatorAction[]) => actions.reduce(reducer, state);

describe("BUG-01 — la navigation ne détruit jamais les réponses", () => {
  it("un aller-retour sur toutes les étapes conserve chaque valeur saisie", () => {
    let s = apply(
      initial(),
      { type: "set_profile", status: "porte_ailleurs", impatrie: false },
      { type: "set_tjm_exact", value: 640 },
      { type: "set_field", key: "days", value: 18 },
      { type: "set_field", key: "fraisMensuels", value: 350 },
      { type: "set_field", key: "situation", value: "marie_pacse" },
      { type: "set_field", key: "enfants", value: 2 },
      { type: "set_field", key: "per", value: 3_000 },
    );

    // Avance jusqu'au bout, puis revient trois écrans en arrière, puis ravance.
    for (const step of STEPS) s = reducer(s, { type: "go_to", step });
    for (const step of [...STEPS].reverse().slice(1, 4)) s = reducer(s, { type: "go_to", step });
    for (const step of STEPS) s = reducer(s, { type: "go_to", step });

    expect(s.form.status).toBe("porte_ailleurs");
    expect(s.form.tjmExact).toBe(640);
    expect(s.form.days).toBe(18);
    expect(s.form.fraisMensuels).toBe(350);
    expect(s.form.situation).toBe("marie_pacse");
    expect(s.form.enfants).toBe(2);
    expect(s.form.per).toBe(3_000);
  });

  it("la garde alternée ne peut pas dépasser le nombre d'enfants", () => {
    const s = apply(
      initial(),
      { type: "set_field", key: "enfants", value: 3 },
      { type: "set_field", key: "gardeAlternee", value: 3 },
      { type: "set_field", key: "enfants", value: 1 },
    );
    expect(s.form.gardeAlternee).toBe(1);
  });
});

describe("BUG-02 — le mode de saisie du TJM est mémorisé et réversible", () => {
  it("passer en fourchette puis revenir en exact rend la valeur exacte saisie", () => {
    let s = reducer(initial(), { type: "set_tjm_exact", value: 640 });
    expect(s.form.tjmMode).toBe("exact");

    s = reducer(s, { type: "set_tjm_mode", mode: "fourchette" });
    expect(s.form.tjmMode).toBe("fourchette");
    // La fourchette pré-sélectionnée contient bien la valeur exacte.
    expect(activeBracket(s.form).min).toBeLessThanOrEqual(640);
    expect(activeBracket(s.form).max).toBeGreaterThan(640);
    // La saisie exacte n'est pas détruite.
    expect(s.form.tjmExact).toBe(640);

    s = reducer(s, { type: "set_tjm_mode", mode: "exact" });
    expect(s.form.tjmMode).toBe("exact");
    expect(s.form.tjmExact).toBe(640);
    expect(resolvedTjm(s.form)).toBe(640);
  });

  it("une fourchette se calcule sur sa médiane, jamais sur zéro", () => {
    const s = reducer(initial(), { type: "set_tjm_bracket", id: "350-500" });
    expect(s.form.tjmMode).toBe("fourchette");
    expect(resolvedTjm(s.form)).toBe(425);
    expect(resolvedTjm(s.form)).toBeGreaterThan(0);
  });

  it("aucune fourchette ne produit un TJM nul", () => {
    for (const id of ["lt350", "350-500", "500-650", "gt650"]) {
      const s = reducer(initial(), { type: "set_tjm_bracket", id });
      expect(resolvedTjm(s.form)).toBeGreaterThan(0);
    }
  });

  it("un identifiant de fourchette inconnu retombe sur une valeur exploitable", () => {
    const s = reducer(initial(), { type: "set_tjm_bracket", id: "nawak" });
    expect(resolvedTjm(s.form)).toBeGreaterThan(0);
  });
});

describe("§3.2 — relais du diagnostic flash", () => {
  const relais: DiagnosticAnswers = { segment: "porte", tjmBracketId: "500-650", dejaCalcule: "non" };

  it("préremplit le profil et la fourchette, et les marque comme repris", () => {
    const s = reducer(initial(), { type: "apply_diagnostic", answers: relais });
    expect(s.form.status).toBe("porte_ailleurs");
    expect(s.form.tjmMode).toBe("fourchette");
    expect(s.form.tjmBracketId).toBe("500-650");
    expect(resolvedTjm(s.form)).toBe(575);
    expect(s.prefilled).toEqual({ status: true, tjm: true });
    // La 3e réponse est conservée mais n'entre dans aucun calcul.
    expect(s.dejaCalcule).toBe("non");
  });

  it("préremplir n'est pas verrouiller : tout reste modifiable", () => {
    let s = reducer(initial(), { type: "apply_diagnostic", answers: relais });
    s = reducer(s, { type: "set_profile", status: "salarie_esn", impatrie: false });
    s = reducer(s, { type: "set_tjm_exact", value: 810 });
    expect(s.form.status).toBe("salarie_esn");
    expect(s.form.tjmMode).toBe("exact");
    expect(resolvedTjm(s.form)).toBe(810);
    // Choisir soi-même lève la marque « repris du diagnostic ».
    expect(s.prefilled).toEqual({ status: false, tjm: false });
  });

  it("un relais partiel ne préremplit que ce qu'il porte", () => {
    const s = reducer(initial(), {
      type: "apply_diagnostic",
      answers: { segment: null, tjmBracketId: "lt350", dejaCalcule: null },
    });
    expect(s.form.status).toBeNull();
    expect(s.prefilled).toEqual({ status: false, tjm: true });
  });

  it("un relais entièrement invalide laisse l'état intact", () => {
    const base = initial();
    const s = reducer(base, { type: "apply_diagnostic", answers: { segment: null, tjmBracketId: null, dejaCalcule: null } });
    expect(s.form).toEqual(base.form);
    expect(s.prefilled).toEqual({ status: false, tjm: false });
  });

  it("« Nouvelle simulation » efface aussi les marques de préremplissage", () => {
    let s = reducer(initial(), { type: "apply_diagnostic", answers: relais });
    s = reducer(s, { type: "reset", simulationId: "sim-neuf" });
    expect(s.prefilled).toEqual({ status: false, tjm: false });
    expect(s.dejaCalcule).toBeNull();
    expect(s.form.status).toBeNull();
  });
});

describe("BUG-03 — « Nouvelle simulation » repart d'un état vide", () => {
  it("remet le formulaire, l'étape, le déverrouillage et l'identifiant à zéro", () => {
    const s = apply(
      initial(),
      { type: "set_tjm_exact", value: 900 },
      { type: "set_field", key: "enfants", value: 3 },
      { type: "go_to", step: "resultats" },
      { type: "unlock", leadId: "lead-123" },
    );
    expect(s.unlocked).toBe(true);

    const neuf = reducer(s, { type: "reset", simulationId: "sim-2" });
    expect(neuf.step).toBe("profil");
    expect(neuf.form).toEqual(DEFAULT_FORM);
    expect(neuf.unlocked).toBe(false);
    expect(neuf.leadId).toBeNull();
    expect(neuf.simulationId).toBe("sim-2");
    expect(neuf.visited).toEqual(["profil"]);
  });

  it("après réinitialisation, toutes les étapes sont de nouveau atteignables", () => {
    let s = reducer(initial(), { type: "reset", simulationId: "sim-3" });
    for (const step of STEPS) {
      s = reducer(s, { type: "go_to", step });
      expect(s.step).toBe(step);
    }
    expect(s.visited).toEqual([...STEPS]);
  });
});
