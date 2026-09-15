/**
 * Autosave / restauration (§4.1).
 *
 * Ce que ces tests verrouillent : le TTL, la tolérance de schéma, et surtout
 * qu'aucun état enregistré — même corrompu à la main — ne peut faire planter
 * le simulateur.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { clearState, loadState, saveState, STORAGE_KEY, TTL_MS } from "@/lib/simulateur/persistence";
import { createInitialState, DEFAULT_FORM } from "@/lib/simulateur/state";

/** localStorage minimal — l'environnement de test est « node ». */
function installStorage(): Map<string, string> {
  const map = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
      clear: () => map.clear(),
    },
  });
  return map;
}

let store: Map<string, string>;
beforeEach(() => {
  store = installStorage();
});

describe("aller-retour", () => {
  it("un état sauvegardé est restauré à l'identique", () => {
    const state = { ...createInitialState("sim-1"), step: "foyer" as const };
    state.form.tjmExact = 640;
    state.form.enfants = 2;
    saveState(state);

    const restored = loadState();
    expect(restored).not.toBeNull();
    expect(restored!.step).toBe("foyer");
    expect(restored!.form.tjmExact).toBe(640);
    expect(restored!.form.enfants).toBe(2);
    expect(restored!.simulationId).toBe("sim-1");
  });

  it("clearState efface réellement l'état", () => {
    saveState(createInitialState("sim-1"));
    clearState();
    expect(loadState()).toBeNull();
  });
});

describe("TTL", () => {
  it("un état plus vieux que 7 jours est ignoré et purgé", () => {
    saveState(createInitialState("sim-1"));
    expect(loadState(Date.now() + TTL_MS - 1_000)).not.toBeNull();
    expect(loadState(Date.now() + TTL_MS + 1_000)).toBeNull();
    expect(store.get(STORAGE_KEY)).toBeUndefined();
  });
});

describe("tolérance de schéma — ne jamais planter", () => {
  const corrompus: [string, string][] = [
    ["JSON invalide", "{{{pas du json"],
    ["enveloppe vide", "{}"],
    ["version inconnue", JSON.stringify({ v: 99, savedAt: new Date().toISOString(), state: {} })],
    ["état absent", JSON.stringify({ v: 2, savedAt: new Date().toISOString() })],
    ["état null", JSON.stringify({ v: 2, savedAt: new Date().toISOString(), state: null })],
    ["horodatage absent", JSON.stringify({ v: 2, state: createInitialState("x") })],
  ];

  for (const [label, raw] of corrompus) {
    it(`${label} → repart proprement d'un état vide`, () => {
      store.set(STORAGE_KEY, raw);
      expect(() => loadState()).not.toThrow();
      expect(loadState()).toBeNull();
    });
  }

  it("des champs de types aberrants reprennent leur valeur par défaut", () => {
    store.set(
      STORAGE_KEY,
      JSON.stringify({
        v: 2,
        savedAt: new Date().toISOString(),
        state: {
          simulationId: "sim-x",
          step: "etape-qui-nexiste-pas",
          visited: ["profil", "inconnue"],
          form: { tjmExact: "beaucoup", days: null, enfants: 2, gardeAlternee: 9, per: Number.NaN },
        },
      }),
    );

    const s = loadState();
    expect(s).not.toBeNull();
    // Types invalides → défauts ; valeur valide conservée.
    expect(s!.form.tjmExact).toBe(DEFAULT_FORM.tjmExact);
    expect(s!.form.days).toBe(DEFAULT_FORM.days);
    expect(s!.form.per).toBe(DEFAULT_FORM.per);
    expect(s!.form.enfants).toBe(2);
    // Invariant métier réappliqué à la restauration.
    expect(s!.form.gardeAlternee).toBeLessThanOrEqual(s!.form.enfants);
    // Étape inconnue → retour au début ; étapes inconnues filtrées.
    expect(s!.step).toBe("profil");
    expect(s!.visited).toEqual(["profil"]);
  });

  it("un état v1 (ancien format, sans mode de saisie TJM) est purgé, pas migré à moitié", () => {
    store.set("rdp_sim_state", JSON.stringify({ form: { tjm: 420 }, step: 3 }));
    expect(loadState()).toBeNull();
    expect(store.get("rdp_sim_state")).toBeUndefined();
  });
});

describe("stockage indisponible (navigation privée, quota)", () => {
  it("loadState et saveState ne lèvent jamais", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: () => {
          throw new Error("SecurityError");
        },
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
        removeItem: () => {
          throw new Error("SecurityError");
        },
      },
    });
    expect(() => saveState(createInitialState("sim-1"))).not.toThrow();
    expect(loadState()).toBeNull();
  });
});
