/**
 * Gabarits d'emails transactionnels (§5.1 à §5.3).
 *
 * Ce qui est verrouillé : les contraintes de compatibilité clients mail, la
 * présence d'une version texte, l'échappement des données utilisateur, et le
 * fait que la mention des avantages reste dérivée de la sélection réelle
 * jusque dans l'email (BUG-04).
 */
import { describe, expect, it } from "vitest";
import { emailDemandeDiagnosticInterne, emailDemandeDiagnosticLead } from "@/lib/email/templates/diagnostic";
import { emailNouveauLead } from "@/lib/email/templates/nouveau-lead";
import { emailRecapLead } from "@/lib/email/templates/recap";
import { makeLead, makePayload } from "./fixtures";

const tousLesEmails = () => {
  const p = makePayload();
  return [
    ["E1 récapitulatif lead", emailRecapLead(p)],
    ["Notification interne — nouveau lead", emailNouveauLead({ lead: makeLead(), payload: p, dossierUrl: "https://simulateur.rdportage.com/dossier?d=x&s=y" })],
    ["E3 demande de diagnostic — lead", emailDemandeDiagnosticLead(p)],
    ["E4 demande de diagnostic — interne", emailDemandeDiagnosticInterne(p)],
  ] as const;
};

describe("contraintes clients mail (§5.3)", () => {
  for (const [nom, mail] of tousLesEmails()) {
    describe(nom, () => {
      it("fournit un sujet, un HTML et une version texte non vides", () => {
        expect(mail.subject.length).toBeGreaterThan(0);
        expect(mail.html.length).toBeGreaterThan(0);
        expect(mail.text.length).toBeGreaterThan(0);
      });

      it("utilise des tableaux et du CSS inline, jamais flex ni grid", () => {
        expect(mail.html).toContain("<table");
        expect(mail.html).toContain("style=");
        expect(mail.html).not.toMatch(/display\s*:\s*(flex|grid)/);
      });

      it("est bâti sur une largeur de 600 px", () => {
        expect(mail.html).toContain('width="600"');
      });

      it("n'embarque ni feuille de style externe ni JavaScript", () => {
        expect(mail.html).not.toContain("<script");
        expect(mail.html).not.toContain("<link");
      });

      it("ne laisse fuir aucun jeton de gabarit non résolu", () => {
        expect(mail.html).not.toContain("undefined");
        expect(mail.html).not.toContain("NaN");
        expect(mail.text).not.toContain("undefined");
        expect(mail.text).not.toContain("NaN");
      });
    });
  }
});

describe("RGPD (§5.2)", () => {
  it("l'email au lead porte l'usage des données, le lien de confidentialité et la désinscription", () => {
    const mail = emailRecapLead(makePayload(), "https://rd-portage.vercel.app/desinscription?t=abc");
    expect(mail.html).toContain("/confidentialite");
    expect(mail.html).toContain("Vos données servent uniquement");
    expect(mail.html).toContain("Se désinscrire");
  });

  it("l'email au lead porte la mention de valeur indicative", () => {
    expect(emailRecapLead(makePayload()).html).toContain("ne constitue pas un conseil fiscal");
  });
});

describe("BUG-04 — la mention des avantages suit la sélection, jusque dans l'email", () => {
  it("sans aucun avantage : la mention est explicitement « aucun »", () => {
    const p = makePayload({ cagnotte: "aucune", titresResto: false });
    const mail = emailRecapLead(p);
    expect(p.avantages.avantagesInclus).toBe(false);
    expect(mail.html).toContain("aucun");
    expect(mail.html).not.toContain("May");
    expect(mail.html).not.toContain("Wawashi");
    expect(mail.text).toContain("Aucun avantage retenu");
  });

  it("avec May : le montant net figure et Wawashi n'apparaît pas", () => {
    const mail = emailRecapLead(makePayload({ cagnotte: "may", titresResto: true }));
    expect(mail.html).toContain("May");
    expect(mail.html).not.toContain("Wawashi");
    expect(mail.html).toContain("Titres-restaurant");
  });

  it("avec Wawashi : les frais de service apparaissent en clair", () => {
    const mail = emailRecapLead(makePayload({ cagnotte: "wawashi" }));
    expect(mail.html).toContain("Wawashi");
    expect(mail.html).toContain("3,5");
  });
});

describe("BUG-02 — un écart négatif est annoncé, jamais masqué", () => {
  it("le profil micro reçoit une lecture honnête de l'écart", () => {
    const p = makePayload({ status: "freelance_micro" });
    expect(p.resultats.laisseSurLaTable).toBeLessThan(0);
    const mail = emailRecapLead(p);
    expect(mail.html).toContain("votre statut actuel vous laisse");
    expect(mail.html).toContain("assurance chômage");
    expect(mail.html).not.toContain("0 € par an sur la table");
  });

  it("un profil gagnant reçoit bien l'accroche « sur la table »", () => {
    const p = makePayload({ status: "porte_ailleurs" });
    expect(p.resultats.laisseSurLaTable).toBeGreaterThan(0);
    expect(emailRecapLead(p).html).toContain("sur la table");
  });

  it("le mode fourchette est annoncé avec sa médiane de calcul", () => {
    const p = makePayload({ tjmMode: "fourchette", tjmBracketId: "350-500" });
    const mail = emailRecapLead(p);
    expect(mail.html).toContain("Fourchette");
    expect(mail.html).toContain("425");
    expect(mail.text).toContain("fourchette");
  });
});

describe("échappement des données utilisateur", () => {
  it("un prénom contenant du HTML est neutralisé", () => {
    const p = makePayload();
    p.identite.prenom = '<script>alert("xss")</script>';
    const mail = emailRecapLead(p);
    expect(mail.html).not.toContain("<script>alert");
    expect(mail.html).toContain("&lt;script&gt;");
  });
});

describe("notification « Nouveau lead simulateur »", () => {
  const dossierUrl = "https://simulateur.rdportage.com/dossier?d=abc&s=def";

  it("porte l'objet exigé : prénom et annonce d'origine", () => {
    expect(emailNouveauLead({ lead: makeLead(), payload: makePayload(), dossierUrl }).subject).toBe(
      "Nouveau lead simulateur — Camille — B_Foyer_s04",
    );
  });

  it("retombe sur la campagne, puis sur « accès direct », quand l'annonce manque", () => {
    const sansAnnonce = makeLead();
    sansAnnonce.attribution.first_touch = { utm_campaign: "Campagne_X", timestamp: sansAnnonce.created_at };
    expect(emailNouveauLead({ lead: sansAnnonce, payload: null }).subject).toContain("— Campagne_X");
    const direct = makeLead();
    direct.attribution = { ...direct.attribution, first_touch: { timestamp: direct.created_at }, lead_source: "direct" };
    expect(emailNouveauLead({ lead: direct, payload: null }).subject).toContain("— accès direct");
  });

  it("met le téléphone en lien tel:, la source complète, le résumé et le dossier", () => {
    const { html, text } = emailNouveauLead({ lead: makeLead(), payload: makePayload(), dossierUrl });
    expect(html).toContain('href="tel:+33612345678"');
    expect(html).toContain("+33 6 12 34 56 78");
    for (const v of ["B_Foyer_s04", "RDP_Leads_10-2026", "meta", "paid_social", "lp_b", "inscription", "Freelance · TJM 500 à 650 €"]) {
      expect(html).toContain(v);
    }
    expect(html).toContain("Clic publicitaire Meta (fbclid)");
    expect(html).toContain(dossierUrl.replace(/&/g, "&amp;"));
    expect(text).toContain("tel:+33612345678");
    // La copie de l'email reçu par le prospect suit, comme demandé le 08/09.
    expect(html).toContain("Copie de l'email reçu par le prospect");
  });

  it("en cas d'alerte, le signale dans l'objet et joint les données brutes", () => {
    const mail = emailNouveauLead({ lead: makeLead(), payload: null, alertes: ["l'écriture dans le CRM a échoué"] });
    expect(mail.subject.startsWith("[ALERTE] ")).toBe(true);
    expect(mail.html).toContain("DONNÉES BRUTES");
    expect(mail.text).toContain("DONNÉES BRUTES");
  });

  it("échappe les données saisies par le prospect", () => {
    const lead = makeLead({ identity: { email: "camille@example.com", first_name: '<img src=x onerror="alert(1)">', phone: "+33612345678" } });
    const { html } = emailNouveauLead({ lead, payload: null });
    expect(html).not.toContain("<img src=x");
  });
});

describe("E4 — copie interne de la demande de diagnostic", () => {
  it("E4 porte les coordonnées et les données clés", () => {
    const p = makePayload();
    const interne = emailDemandeDiagnosticInterne(p);
    expect(interne.subject).toContain("[Diagnostic]");
    expect(interne.html).toContain(p.identite.email);
    expect(interne.html).toContain(p.identite.telephone!);
    expect(interne.html).toContain("Taux de restitution");
  });

  it("les sujets internes et lead sont distincts, pour rester filtrables", () => {
    const p = makePayload();
    expect(emailDemandeDiagnosticInterne(p).subject).not.toBe(emailDemandeDiagnosticLead(p).subject);
  });
});
