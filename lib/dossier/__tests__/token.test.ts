/**
 * Lien signé du dossier — le récapitulatif voyage dans l'URL (BUG-06).
 * Ce qui est verrouillé : l'aller-retour est fidèle, toute altération est
 * rejetée, et rien ne lève jamais.
 */
import { describe, expect, it } from "vitest";
import { decodeDossier, dossierUrl, encodeDossier } from "@/lib/dossier/token";
import { makePayload } from "@/lib/email/__tests__/fixtures";

describe("aller-retour", () => {
  it("restitue le payload à l'identique", () => {
    const p = makePayload();
    const { d, s } = encodeDossier(p);
    expect(decodeDossier(d, s)).toEqual(p);
  });

  it("produit une URL exploitable et de taille raisonnable pour un email", () => {
    const url = dossierUrl(makePayload(), "https://rd-portage.vercel.app");
    expect(url.startsWith("https://rd-portage.vercel.app/dossier?d=")).toBe(true);
    expect(url).toContain("&s=");
    // Compression gzip : le lien doit rester sous la limite usuelle des clients mail.
    expect(url.length).toBeLessThan(2_000);
  });
});

describe("intégrité", () => {
  it("rejette un payload altéré", () => {
    const { d, s } = encodeDossier(makePayload());
    const altere = d.slice(0, -4) + "AAAA";
    expect(decodeDossier(altere, s)).toBeNull();
  });

  it("rejette une signature altérée", () => {
    const { d, s } = encodeDossier(makePayload());
    expect(decodeDossier(d, s.slice(0, -2) + "zz")).toBeNull();
  });

  it("rejette les entrées absentes ou malformées sans jamais lever", () => {
    for (const [d, s] of [
      [null, null],
      ["", ""],
      ["pas-du-base64", "nawak"],
      [undefined, "abc"],
    ] as [string | null | undefined, string | null | undefined][]) {
      expect(() => decodeDossier(d, s)).not.toThrow();
      expect(decodeDossier(d, s)).toBeNull();
    }
  });
});
