import { describe, expect, it } from "vitest";
import { angleOf, defaultHeadline, HEADLINES, headlineForAd } from "@/config/headlines";

describe("titres d'accueil selon la pub", () => {
  it.each([
    ["B_Foyer_s04", "Ton simulateur oublie ton foyer"],
    ["C06_MemeTJM_MOF", "Même TJM, pas le même impôt"],
    ["A_Offre_s01", "Calcule ton vrai taux"],
    ["C_Fondateur_s03", "Découvre ton vrai net avant de signer"],
    ["C09_AncienPorte_TOF", "Créé par un ancien consultant porté"],
    ["C01_FicheDePaie_TOF", "Ton vrai net, avant la fiche de paie"],
    ["C03_PlusDeFake_TOF", "Pas de promesse. Un calcul."],
    ["C16_SansEmail_BOF", "Ton net en 3 questions"],
  ])("%s → « %s »", (ad, title) => {
    expect(headlineForAd(ad)?.title).toBe(title);
  });

  it("reconnaît une déclinaison de la même annonce, quelle que soit la casse", () => {
    expect(headlineForAd("b_foyer_s04_v2")?.key).toBe("foyer");
  });

  it("une annonce inconnue ou inactive (D) ne force aucune variante", () => {
    expect(headlineForAd("D_Conformite_s05")).toBeNull();
    expect(headlineForAd("")).toBeNull();
    expect(headlineForAd(null)).toBeNull();
  });

  it("le titre par défaut est un titre validé", () => {
    expect(defaultHeadline().title).toBe("Calcule ton vrai taux");
  });

  it("chaque surligné figure bien dans son titre, et chaque angle est un identifiant technique", () => {
    for (const h of HEADLINES) {
      expect(h.title).toContain(h.highlight);
      expect(angleOf(h)).toMatch(/^[a-z0-9_-]{1,64}$/);
    }
  });
});
