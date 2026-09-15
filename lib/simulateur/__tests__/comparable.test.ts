/**
 * §4.3 — un profil sans situation actuelle n'a pas de comparatif.
 *
 * « En transition » n'a rien à comparer : le scénario « actuel » y est une
 * projection en micro, pas un existant. Afficher un écart, même nul, n'aurait
 * aucun sens — et l'invariant anti-zéro dit qu'il vaut mieux ne rien afficher
 * qu'un zéro creux.
 */
import { describe, expect, it } from "vitest";
import { emailRecapLead } from "@/lib/email/templates/recap";
import { makePayload } from "@/lib/email/__tests__/fixtures";
import type { CurrentStatus } from "@/lib/fiscal/scenarios";

describe("champ `comparable` du contrat de données", () => {
  it("est faux pour « en transition », vrai pour tous les autres profils", () => {
    expect(makePayload({ status: "transition" }).resultats.comparable).toBe(false);
    for (const status of ["porte_ailleurs", "freelance_micro", "freelance_sasu", "salarie_esn"] as CurrentStatus[]) {
      expect(makePayload({ status }).resultats.comparable, status).toBe(true);
    }
  });
});

describe("l'email respecte la règle sans la redécider", () => {
  it("en transition : aucun comparatif, aucun « sur la table »", () => {
    const mail = emailRecapLead(makePayload({ status: "transition" }));
    expect(mail.html).not.toContain("Les trois scénarios comparés");
    expect(mail.html).not.toContain("sur la table");
    expect(mail.html).toContain("Votre portage RD optimisé");
    expect(mail.html).toContain("pas de situation actuelle à comparer");
    expect(mail.text).toContain("VOTRE PORTAGE RD OPTIMISÉ");
    expect(mail.text).not.toContain("LES TROIS SCÉNARIOS");
  });

  it("profil comparable : le comparatif est bien présent", () => {
    const mail = emailRecapLead(makePayload({ status: "porte_ailleurs" }));
    expect(mail.html).toContain("Les trois scénarios comparés");
    expect(mail.text).toContain("LES TROIS SCÉNARIOS");
  });

  it("aucun des deux cas ne laisse fuir NaN ou undefined", () => {
    for (const status of ["transition", "porte_ailleurs"] as CurrentStatus[]) {
      const mail = emailRecapLead(makePayload({ status }));
      expect(mail.html).not.toContain("NaN");
      expect(mail.html).not.toContain("undefined");
    }
  });
});
