/** Retours du 25/09 sur l'email récapitulatif et la désinscription. */
import { describe, expect, it } from "vitest";
import { emailRecapLead } from "@/lib/email/templates/recap";
import { unsubscribeUrl, verifyUnsubscribe } from "@/lib/email/unsubscribe";
import { makePayload } from "./fixtures";

describe("#12 — les frais pro saisis apparaissent dans « Votre situation »", () => {
  it("version HTML et version texte", () => {
    const p = makePayload({ fraisMensuels: 400 });
    const { html, text } = emailRecapLead(p);
    expect(text).toContain("Frais professionnels : 400");
    expect(html).toContain("Frais professionnels");
  });

  it("au-delà de la limite, l'email dit ce qui est saisi ET ce qui est retenu", () => {
    const { text } = emailRecapLead(makePayload({ fraisMensuels: 2_000 }));
    expect(text).toMatch(/2 000 € \/ mois saisis, .* retenus/);
  });
});

describe("#13 — lien de désinscription", () => {
  it("présent dans la version texte", () => {
    const url = unsubscribeUrl("camille@example.com", "https://simulateur.rdportage.com");
    const { text } = emailRecapLead(makePayload(), url);
    expect(text).toContain(`Se désinscrire : ${url}`);
  });

  it("signé : l'email revient intact, une URL fabriquée est refusée", () => {
    const url = new URL(unsubscribeUrl("Camille@Example.com", "https://x.test"));
    expect(verifyUnsubscribe(url.searchParams.get("e"), url.searchParams.get("s"))).toBe("camille@example.com");
    expect(verifyUnsubscribe(url.searchParams.get("e"), "signature-inventee")).toBeNull();
  });
});

describe("#28 / #34 — le taux de restitution dit sa base", () => {
  it("avant impôt, avec la part en avantages", () => {
    const { text } = emailRecapLead(makePayload({ cagnotte: "may", titresResto: true }));
    expect(text).toContain("avant impôt sur le revenu");
    expect(text).toContain("non retirables en argent");
  });
});

describe("#15 — nouvelle adresse", () => {
  it("l'ancienne adresse a disparu de l'email", () => {
    const { html, text } = emailRecapLead(makePayload());
    expect(html + text).not.toContain("Stephenson");
    expect(html).toContain("1 place Charles de Gaulle");
  });
});
