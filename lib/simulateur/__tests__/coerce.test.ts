/**
 * Validation d'un formulaire venu de l'extérieur.
 *
 * Ces tests existent à cause d'un défaut réel : la validation comparait
 * `typeof v === typeof DEFAULT_FORM[k]`. Depuis que `status` n'a plus de
 * valeur par défaut, `typeof null` vaut "object", et tout profil transmis en
 * chaîne était donc rejeté en silence. Conséquence en production : profil
 * perdu au rechargement de la page, récapitulatif jugé non calculable côté
 * serveur, donc AUCUN email et AUCUN lien de dossier.
 */
import { describe, expect, it } from "vitest";
import { coerceFormState, DEFAULT_FORM, resolvedTjm } from "@/lib/simulateur/state";
import { buildServerPayload } from "@/lib/email/context";
import type { CurrentStatus } from "@/lib/fiscal/scenarios";

describe("le profil survit à l'aller-retour", () => {
  it("chaque profil connu est conservé", () => {
    for (const status of ["salarie_esn", "freelance_micro", "freelance_sasu", "porte_ailleurs", "transition"] as CurrentStatus[]) {
      expect(coerceFormState({ ...DEFAULT_FORM, status }).status, status).toBe(status);
    }
  });

  it("un profil inconnu ou absent retombe à null, jamais sur une valeur inventée", () => {
    expect(coerceFormState({ status: "astronaute" }).status).toBeNull();
    expect(coerceFormState({}).status).toBeNull();
    expect(coerceFormState({ status: 42 }).status).toBeNull();
  });
});

describe("les autres champs sont validés par type réel", () => {
  it("conserve un formulaire complet et valide", () => {
    const source = {
      ...DEFAULT_FORM,
      status: "porte_ailleurs",
      tjmMode: "fourchette",
      tjmBracketId: "500-650",
      days: 18,
      cagnotte: "wawashi",
      titresResto: false,
      situation: "marie_pacse",
      enfants: 2,
      per: 3000,
    };
    const f = coerceFormState(source);
    expect(f.status).toBe("porte_ailleurs");
    expect(f.tjmMode).toBe("fourchette");
    expect(resolvedTjm(f)).toBe(575);
    expect(f.days).toBe(18);
    expect(f.cagnotte).toBe("wawashi");
    expect(f.titresResto).toBe(false);
    expect(f.situation).toBe("marie_pacse");
    expect(f.enfants).toBe(2);
    expect(f.per).toBe(3000);
  });

  it("rejette les valeurs aberrantes sans jamais lever", () => {
    for (const raw of [null, undefined, 42, "texte", [], { days: "beaucoup" }, { tjmExact: Number.NaN }, { cagnotte: "or" }]) {
      expect(() => coerceFormState(raw)).not.toThrow();
      const f = coerceFormState(raw);
      expect(Number.isFinite(f.days)).toBe(true);
      expect(Number.isFinite(f.tjmExact)).toBe(true);
      expect(["may", "wawashi", "aucune"]).toContain(f.cagnotte);
    }
  });

  it("la garde alternée reste bornée par le nombre d'enfants", () => {
    expect(coerceFormState({ enfants: 1, gardeAlternee: 5 }).gardeAlternee).toBe(1);
  });
});

describe("le récapitulatif serveur est calculable après validation", () => {
  const args = {
    identite: { prenom: "Camille", email: "camille@example.com" },
    simulationId: "sim-1",
    baseUrl: "https://simulateur.rdportage.com",
  };

  it("un formulaire transmis par le navigateur produit bien un récapitulatif", () => {
    const form = coerceFormState({ ...DEFAULT_FORM, status: "porte_ailleurs", tjmExact: 640, days: 20 });
    const payload = buildServerPayload({ form, ...args });
    expect(payload, "le récapitulatif doit être calculable, sinon aucun email ne part").not.toBeNull();
    expect(payload!.identite.profilLabel).toBe("Déjà en portage");
    expect(payload!.resultats.mensuel.caHt).toBeGreaterThan(0);
  });

  it("sans profil, il est refusé explicitement", () => {
    const form = coerceFormState({ ...DEFAULT_FORM, status: null, tjmExact: 640, days: 20 });
    expect(buildServerPayload({ form, ...args })).toBeNull();
  });
});
