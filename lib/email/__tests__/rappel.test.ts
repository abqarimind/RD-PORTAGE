/** Décisions client du 24/09 : rappel « sous 24 h », ligne de l'équipe, plus de « Ridha » au contact. */
import { describe, expect, it } from "vitest";
import { emailDemandeDiagnosticLead } from "@/lib/email/templates/diagnostic";
import { makePayload } from "./fixtures";

describe("E3 — demande de diagnostic", () => {
  it("avec téléphone : promet un rappel sous 24 h à ce numéro", () => {
    const p = makePayload();
    p.identite.telephone = "06 11 22 33 44";
    const { html, text } = emailDemandeDiagnosticLead(p);
    expect(text).toContain("Un conseiller RD Portage vous rappelle sous 24 h au 06 11 22 33 44.");
    expect(html).not.toContain("Ridha");
  });

  it("sans téléphone : ne promet aucun rappel à un numéro inexistant", () => {
    const p = makePayload();
    p.identite.telephone = undefined;
    const { text } = emailDemandeDiagnosticLead(p);
    expect(text).not.toContain("au numéro");
    expect(text).toContain("appelez-nous au 01 71 49 71 57");
  });
});
