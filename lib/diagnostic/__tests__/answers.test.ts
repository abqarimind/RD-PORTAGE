/**
 * Contrat de relais diagnostic → simulateur (§3.2, tests §8.4).
 *
 * Ce qui est verrouillé : l'aller-retour est fidèle, un relais partiel reste
 * exploitable, et des données absentes, tronquées ou bricolées à la main
 * donnent un parcours vierge plutôt qu'un écran cassé.
 */
import { describe, expect, it } from "vitest";
import {
  answeredCount,
  carriesRelay,
  decodeAnswers,
  DIAGNOSTIC_SEGMENTS,
  encodeAnswers,
  EMPTY_ANSWERS,
  isComplete,
  sanitizeAnswers,
  simulateurHref,
  type DiagnosticAnswers,
} from "@/lib/diagnostic/answers";
import { TJM_BRACKETS } from "@/lib/simulateur/brackets";

const complete: DiagnosticAnswers = { segment: "porte", tjmBracketId: "500-650", dejaCalcule: "non" };
const query = (s: string) => new URLSearchParams(s);

describe("aller-retour", () => {
  it("restitue les trois réponses à l'identique", () => {
    expect(decodeAnswers(query(encodeAnswers(complete)))).toEqual(complete);
  });

  it("produit un lien de simulateur exploitable", () => {
    const href = simulateurHref(complete);
    expect(href.startsWith("/simulateur?")).toBe(true);
    expect(href).toContain("from=diag");
    expect(href).toContain("p=porte");
    expect(href).toContain("t=500-650");
  });

  it("chaque segment et chaque fourchette font l'aller-retour", () => {
    for (const s of DIAGNOSTIC_SEGMENTS) {
      for (const b of TJM_BRACKETS) {
        const a: DiagnosticAnswers = { segment: s.id, tjmBracketId: b.id, dejaCalcule: "oui" };
        expect(decodeAnswers(query(encodeAnswers(a)))).toEqual(a);
      }
    }
  });

  it("sans aucune réponse, le lien reste le simulateur nu", () => {
    expect(simulateurHref(EMPTY_ANSWERS)).toBe("/simulateur");
  });
});

describe("relais partiel", () => {
  it("un relais sans la 3e réponse reste exploitable", () => {
    const partiel: DiagnosticAnswers = { segment: "freelance", tjmBracketId: "lt350", dejaCalcule: null };
    const decoded = decodeAnswers(query(encodeAnswers(partiel)));
    expect(decoded.segment).toBe("freelance");
    expect(decoded.tjmBracketId).toBe("lt350");
    expect(isComplete(decoded)).toBe(false);
    expect(answeredCount(decoded)).toBe(2);
  });
});

describe("relais dégradé — jamais d'écran cassé (§8.4)", () => {
  const degrades: [string, string][] = [
    ["segment inconnu", "from=diag&p=astronaute&t=350-500&q3=non"],
    ["fourchette inconnue", "from=diag&p=porte&t=999-999&q3=non"],
    ["3e réponse inconnue", "from=diag&p=porte&t=350-500&q3=peut-etre"],
    ["valeurs vides", "from=diag&p=&t=&q3="],
    ["paramètres absents", "from=diag"],
    ["injection", "from=diag&p=<script>&t=../../etc&q3=' OR 1=1"],
    ["valeurs très longues", `from=diag&p=${"a".repeat(3000)}&t=${"b".repeat(3000)}`],
  ];

  for (const [label, qs] of degrades) {
    it(`${label} → réponses ignorées, jamais d'exception`, () => {
      expect(() => decodeAnswers(query(qs))).not.toThrow();
      const decoded = decodeAnswers(query(qs));
      // Toute valeur retenue appartient forcément au domaine connu.
      if (decoded.segment) expect(DIAGNOSTIC_SEGMENTS.map((s) => s.id)).toContain(decoded.segment);
      if (decoded.tjmBracketId) expect(TJM_BRACKETS.map((b) => b.id)).toContain(decoded.tjmBracketId);
      if (decoded.dejaCalcule) expect(["oui", "non", "ignorais"]).toContain(decoded.dejaCalcule);
    });
  }

  it("des paramètres absents ne lèvent pas", () => {
    expect(() => decodeAnswers(null)).not.toThrow();
    expect(decodeAnswers(undefined)).toEqual(EMPTY_ANSWERS);
  });

  it("sanitizeAnswers absorbe n'importe quel objet", () => {
    for (const raw of [null, undefined, 42, "texte", [], { segment: 12 }, { segment: "porte", tjmBracketId: {} }]) {
      expect(() => sanitizeAnswers(raw)).not.toThrow();
      const a = sanitizeAnswers(raw);
      expect(a).toHaveProperty("segment");
      expect(a).toHaveProperty("tjmBracketId");
      expect(a).toHaveProperty("dejaCalcule");
    }
    expect(sanitizeAnswers({ segment: "porte", tjmBracketId: "nawak" }).tjmBracketId).toBeNull();
  });
});

describe("détection du relais", () => {
  it("reconnaît une URL de relais, même partielle", () => {
    expect(carriesRelay(query("from=diag"))).toBe(true);
    expect(carriesRelay(query("p=porte"))).toBe(true);
    expect(carriesRelay(query("t=350-500"))).toBe(true);
  });

  it("ignore une URL ordinaire du simulateur", () => {
    expect(carriesRelay(query("step=foyer"))).toBe(false);
    expect(carriesRelay(query(""))).toBe(false);
    expect(carriesRelay(null)).toBe(false);
  });
});
