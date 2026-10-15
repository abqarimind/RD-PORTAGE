/**
 * Orchestration des envois (§5.1, §5.2).
 *
 * Ce qui est verrouillé : E2/E4 sont des envois SÉPARÉS qui partent même si
 * l'envoi au lead échoue, l'idempotence est portée par une clé stable, et
 * aucun échec ne remonte sous forme d'exception.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SendArgs, SendResult } from "@/lib/email/client";

const envois: SendArgs[] = [];
let reponse: (args: SendArgs) => SendResult = () => ({ ok: true, id: "ok" });
let destinataires: string[] | null = ["marketing@rdportage.com"];

vi.mock("@/lib/email/client", () => ({
  mailFrom: () => "RD Portage <test@example.com>",
  mailFromInterne: () => "Simulateur RD Portage <simulateur@example.com>",
  mailReplyTo: () => "marketing@rdportage.com",
  mailInternalTo: () => destinataires,
  sendEmail: async (args: SendArgs) => {
    envois.push(args);
    return reponse(args);
  },
}));

const { sendDemandeDiagnostic, sendNouveauLead, sendRecapLead } = await import("@/lib/email/send");
const { makeLead, makePayload } = await import("./fixtures");

beforeEach(() => {
  envois.length = 0;
  reponse = () => ({ ok: true, id: "ok" });
  destinataires = ["marketing@rdportage.com"];
});

describe("E1 + notification interne", () => {
  it("le récapitulatif part au lead seul, avec une clé d'idempotence stable", async () => {
    await sendRecapLead(makePayload());
    expect(envois).toHaveLength(1);
    expect(envois[0].to).toBe("camille@example.com");
    expect(envois[0].idempotencyKey).toBe("rdp-recap-lead-sim-fixture-1");
    expect(JSON.stringify(envois)).not.toContain("bcc");
  });

  it("la notification interne est un envoi séparé, à toute la liste, avec plus de tentatives", async () => {
    destinataires = ["marketing@rdportage.com", "ridha@example.com"];
    const lead = makeLead();
    await sendNouveauLead({ lead, payload: makePayload() });
    expect(envois).toHaveLength(1);
    const [notif] = envois;
    expect(notif.to).toEqual(["marketing@rdportage.com", "ridha@example.com"]);
    expect(notif.idempotencyKey).toBe(`rdp-lead-interne-${lead.lead_id}`);
    expect(notif.retries).toBeGreaterThanOrEqual(3);
    expect(notif.retryOnAnyError).toBe(true);
    expect(notif.subject).toBe("Nouveau lead simulateur — Camille — B_Foyer_s04");
  });

  it("sans destinataire configuré, rien ne part et l'absence est signalée", async () => {
    destinataires = null;
    await expect(sendNouveauLead({ lead: makeLead(), payload: null })).resolves.toBeNull();
    expect(envois).toHaveLength(0);
  });

  it("ne lève jamais, même si le transport explose", async () => {
    reponse = () => {
      throw new Error("réseau coupé");
    };
    await expect(sendRecapLead(makePayload())).resolves.toMatchObject({ ok: false });
    await expect(sendNouveauLead({ lead: makeLead(), payload: makePayload() })).resolves.toMatchObject({ ok: false });
  });
});

describe("E3 + E4", () => {
  it("part également en deux envois, avec ses propres clés", async () => {
    await sendDemandeDiagnostic(makePayload());
    expect(envois).toHaveLength(2);
    expect(envois[0].idempotencyKey).toBe("rdp-diagnostic-lead-sim-fixture-1");
    expect(envois[1].idempotencyKey).toBe("rdp-diagnostic-interne-sim-fixture-1");
  });

  it("les clés diagnostic ne collisionnent pas avec les clés récapitulatif", async () => {
    await sendRecapLead(makePayload());
    await sendNouveauLead({ lead: makeLead(), payload: makePayload() });
    const recap = envois.map((e) => e.idempotencyKey);
    envois.length = 0;
    await sendDemandeDiagnostic(makePayload());
    const inscription = envois.map((e) => e.idempotencyKey);
    expect(recap.some((k) => inscription.includes(k))).toBe(false);
  });

  it("« Répondre » depuis la boîte du prospect écrit à l'entreprise (D5)", async () => {
    await sendRecapLead(makePayload());
    expect(envois[0].replyTo).toBe("marketing@rdportage.com");
    envois.length = 0;
    await sendDemandeDiagnostic(makePayload());
    expect(envois[0].replyTo).toBe("marketing@rdportage.com");
  });

  it("les copies internes partent d'un expéditeur distinct de leur destinataire", async () => {
    await sendRecapLead(makePayload());
    await sendNouveauLead({ lead: makeLead(), payload: makePayload() });
    expect(envois[0].from).toBeUndefined();
    expect(envois[1].from).toBe("Simulateur RD Portage <simulateur@example.com>");
  });

  it("les notifications internes permettent de répondre directement au lead", async () => {
    await sendDemandeDiagnostic(makePayload());
    expect(envois[1].replyTo).toBe("camille@example.com");
    envois.length = 0;
    await sendNouveauLead({ lead: makeLead(), payload: makePayload() });
    expect(envois[0].replyTo).toBe("camille@example.com");
  });
});
