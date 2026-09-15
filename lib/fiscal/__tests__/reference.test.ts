/**
 * Cas de référence du cahier de recette (§7.2).
 *
 * TJM 420 €, 20 jours, frais de gestion 4 %, NDF 500 €, cagnotte 1 570 €.
 * Tolérance ±1 % — ces chiffres sortent du classeur interne « Simul
 * Honoraires » et font foi : toute dérive du moteur de paie doit échouer ici.
 */
import { describe, expect, it } from "vitest";
import { computePortage } from "@/lib/fiscal/portage";

const attendu = (valeur: number, cible: number) => {
  expect(Math.abs(valeur - cible) / cible).toBeLessThanOrEqual(0.01);
};

describe("cas de référence RD — TJM 420 × 20 j", () => {
  const r = computePortage({ tjm: 420, days: 20, ndf: 500, cagnotteMay: 1_570, mealVouchers: true });

  it("disponible compte d'activité ≈ 5 918 €", () => attendu(r.available, 5_918));
  it("salaire brut ≈ 4 065 €", () => attendu(r.grossSalary, 4_065));
  it("perçu net + titres-restaurant ≈ 3 821 €", () => attendu(r.netPerceived, 3_821));
  it("rémunération globale ≈ 5 391 €", () => attendu(r.globalCompensation, 5_391));
  it("taux de restitution ≈ 64 %", () => attendu(r.restitutionRate, 0.64));

  it("aucune valeur de la cascade n'est non finie", () => {
    for (const [cle, valeur] of Object.entries(r)) {
      expect(Number.isFinite(valeur), `${cle} = ${valeur}`).toBe(true);
    }
  });
});
