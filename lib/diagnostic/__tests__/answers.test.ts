/**
 * Contrat de relais diagnostic → simulateur (§3.2, tests §8.4).
 *
 * Ce qui est verrouillé : le relais est fidèle, il ne passe JAMAIS par l'URL
 * (le Pixel Meta la transmet), il fonctionne stockage bloqué (mémoire du
 * module), il est consommé à la lecture, et des données absentes, périmées ou
 * bricolées donnent un parcours vierge plutôt qu'un écran cassé.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  answeredCount,
  DIAGNOSTIC_SEGMENTS,
  EMPTY_ANSWERS,
  isComplete,
  sanitizeAnswers,
  type DiagnosticAnswers,
} from "@/lib/diagnostic/answers";
import { consumeDiagnosticRelay, RELAY_TTL_MS, setDiagnosticRelay } from "@/lib/diagnostic/relay";
import { TJM_BRACKETS } from "@/lib/simulateur/brackets";

const complete: DiagnosticAnswers = { segment: "porte", tjmBracketId: "500-650", dejaCalcule: "non" };

/** localStorage minimal (Vitest tourne en environnement node). */
function installStorage(): Map<string, string> {
  const map = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
  return map;
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).localStorage;
  consumeDiagnosticRelay(); // vide la mémoire du module entre deux tests
});

describe("relais — mémoire du module (stockage bloqué)", () => {
  it("restitue les trois réponses sans aucun stockage", () => {
    setDiagnosticRelay(complete);
    expect(consumeDiagnosticRelay()).toEqual(complete);
  });

  it("chaque segment et chaque fourchette passent", () => {
    for (const s of DIAGNOSTIC_SEGMENTS) {
      for (const b of TJM_BRACKETS) {
        const a: DiagnosticAnswers = { segment: s.id, tjmBracketId: b.id, dejaCalcule: "oui" };
        setDiagnosticRelay(a);
        expect(consumeDiagnosticRelay()).toEqual(a);
      }
    }
  });

  it("est consommé à la lecture : une seconde lecture ne rejoue rien", () => {
    setDiagnosticRelay(complete);
    consumeDiagnosticRelay();
    expect(consumeDiagnosticRelay()).toBeNull();
  });

  it("sans aucune réponse, rien n'est relayé", () => {
    setDiagnosticRelay(EMPTY_ANSWERS);
    expect(consumeDiagnosticRelay()).toBeNull();
  });
});

describe("relais — localStorage (rechargement)", () => {
  it("survit à la perte de la mémoire du module", () => {
    const map = installStorage();
    setDiagnosticRelay(complete);
    const raw = [...map.values()][0];
    consumeDiagnosticRelay(); // vide mémoire + stockage
    map.set("rdp_diag_relay_v1", raw); // simule un rechargement de page
    expect(consumeDiagnosticRelay()).toEqual(complete);
    expect(map.size).toBe(0);
  });

  it("un relais périmé est ignoré", () => {
    installStorage();
    setDiagnosticRelay(complete, 0);
    expect(consumeDiagnosticRelay(RELAY_TTL_MS + 1)).toBeNull();
  });

  it("un contenu bricolé ne lève pas et ne retient que des valeurs connues", () => {
    const map = installStorage();
    for (const raw of ["{", "null", '{"savedAt":"x"}', JSON.stringify({ savedAt: Date.now(), answers: { segment: "astronaute", tjmBracketId: "350-500" } })]) {
      map.set("rdp_diag_relay_v1", raw);
      expect(() => consumeDiagnosticRelay()).not.toThrow();
    }
    map.set("rdp_diag_relay_v1", JSON.stringify({ savedAt: Date.now(), answers: { segment: "astronaute", tjmBracketId: "350-500" } }));
    expect(consumeDiagnosticRelay()).toEqual({ segment: null, tjmBracketId: "350-500", dejaCalcule: null });
  });
});

describe("relais partiel", () => {
  it("un relais sans la 3e réponse reste exploitable", () => {
    setDiagnosticRelay({ segment: "freelance", tjmBracketId: "lt350", dejaCalcule: null });
    const decoded = consumeDiagnosticRelay()!;
    expect(decoded.segment).toBe("freelance");
    expect(decoded.tjmBracketId).toBe("lt350");
    expect(isComplete(decoded)).toBe(false);
    expect(answeredCount(decoded)).toBe(2);
  });
});

describe("sanitizeAnswers", () => {
  it("absorbe n'importe quel objet", () => {
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
