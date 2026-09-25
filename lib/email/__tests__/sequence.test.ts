/** Règles de la séquence prospects (décidée le 25/09) — voir content/emails/sequence.md. */
import { describe, expect, it } from "vitest";
import { compterMots, loadSequence } from "@/lib/email/sequence";

const emails = loadSequence();
const statuts = ["salarie_esn", "freelance_micro", "freelance_sasu", "porte_ailleurs", "transition"];

describe("séquence J3 → J14", () => {
  it("4 envois (J3, J6, J10, J14), dont 5 variantes par statut à J10", () => {
    expect([...new Set(emails.map((e) => e.jour))]).toEqual([3, 6, 10, 14]);
    const j10 = emails.filter((e) => e.jour === 10);
    expect(j10.map((e) => e.statut).sort()).toEqual([...statuts].sort());
  });

  it("J14 : une version avec l'écart chiffré, une sans (écart nul ou négatif)", () => {
    const j14 = emails.filter((e) => e.jour === 14);
    expect(j14.map((e) => e.condition).sort()).toEqual(["economie_mensuelle <= 0", "economie_mensuelle > 0"]);
    expect(j14.find((e) => e.condition === "economie_mensuelle <= 0")?.corps).not.toContain("ECONOMIE_MENSUELLE");
  });

  it.each(emails.map((e) => [e.id, e] as const))("%s : 50 à 125 mots, texte simple, aucun lien", (_id, e) => {
    const mots = compterMots(e.corps);
    expect(mots).toBeGreaterThanOrEqual(e.jour === 3 ? 40 : 50);
    expect(mots).toBeLessThanOrEqual(e.jour === 3 ? 80 : 125);
    expect(e.corps).not.toMatch(/https?:\/\//);
    expect(e.html).not.toMatch(/<a |style=|<img/);
  });

  it.each(emails.map((e) => [e.id, e] as const))("%s : se termine par une question", (_id, e) => {
    const dernier = e.corps.trim().split(/\n{2,}/).pop() ?? "";
    expect(dernier).toContain("?");
  });

  it.each(emails.map((e) => [e.id, e] as const))("%s : signé Ridha, pied légal et désinscription", (_id, e) => {
    expect(e.text).toContain("Ridha Chammam");
    expect(e.text).toContain("1 place Charles de Gaulle");
    expect(e.text).toContain("RCS Versailles 912 888 013");
    expect(e.text).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(e.text).toContain("cagnotte May et titres-restaurant compris");
    expect(e.text).not.toMatch(/%[A-Z_]+%/);
  });

  it("uniquement des faits sourcés : aucune affirmation non validée", () => {
    const tout = emails.map((e) => e.text).join("\n");
    expect(tout).not.toMatch(/depuis 2024/i);
    expect(tout).not.toContain("60 000");
    expect(tout).not.toContain("2021");
    expect(tout).not.toContain("Stephenson");
  });
});
