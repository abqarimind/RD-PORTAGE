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

vi.mock("@/lib/email/client", () => ({
  mailFrom: () => "RD Portage <test@example.com>",
  mailFromInterne: () => "Simulateur RD Portage <simulateur@example.com>",
  mailReplyTo: () => "marketing@rdportage.com",
  mailInternalTo: () => "marketing@rdportage.com",
  sendEmail: async (args: SendArgs) => {
    envois.push(args);
    return reponse(args);
  },
}));

const { sendDemandeDiagnostic, sendRecap } = await import("@/lib/email/send");
const { makePayload } = await import("./fixtures");

beforeEach(() => {
  envois.length = 0;
  reponse = () => ({ ok: true, id: "ok" });
});

describe("E1 + E2", () => {
  it("part en deux envois distincts, pas en copie cachée", async () => {
    await sendRecap(makePayload());
    expect(envois).toHaveLength(2);
    const [lead, interne] = envois;
    expect(lead.to).toBe("camille@example.com");
    expect(interne.to).toBe("marketing@rdportage.com");
    // Une copie cachée trahirait un envoi unique.
    expect(JSON.stringify(envois)).not.toContain("bcc");
    expect(lead.subject).not.toBe(interne.subject);
  });

  it("la copie interne part même quand l'envoi au lead échoue", async () => {
    reponse = (args) =>
      args.to === "camille@example.com" ? { ok: false, error: "boîte pleine" } : { ok: true, id: "interne" };

    const report = await sendRecap(makePayload());
    expect(report.lead.ok).toBe(false);
    expect(report.interne?.ok).toBe(true);
    expect(envois.map((e) => e.to)).toContain("marketing@rdportage.com");
  });

  it("porte des clés d'idempotence stables et distinctes par destinataire", async () => {
    await sendRecap(makePayload());
    const [lead, interne] = envois;
    expect(lead.idempotencyKey).toBe("rdp-recap-lead-sim-fixture-1");
    expect(interne.idempotencyKey).toBe("rdp-recap-interne-sim-fixture-1");

    // Rejouer la même simulation redonne exactement les mêmes clés : c'est ce
    // qui permet à Resend de dédoublonner un double-clic ou un retry réseau.
    envois.length = 0;
    await sendRecap(makePayload());
    expect(envois[0].idempotencyKey).toBe(lead.idempotencyKey);
    expect(envois[1].idempotencyKey).toBe(interne.idempotencyKey);
  });

  it("ne lève jamais, même si le transport explose", async () => {
    reponse = () => {
      throw new Error("réseau coupé");
    };
    await expect(sendRecap(makePayload())).resolves.toBeDefined();
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
    await sendRecap(makePayload());
    const recap = envois.map((e) => e.idempotencyKey);
    envois.length = 0;
    await sendDemandeDiagnostic(makePayload());
    const inscription = envois.map((e) => e.idempotencyKey);
    expect(recap.some((k) => inscription.includes(k))).toBe(false);
  });

  it("« Répondre » depuis la boîte du prospect écrit à l'entreprise (D5)", async () => {
    await sendRecap(makePayload());
    expect(envois[0].replyTo).toBe("marketing@rdportage.com");
    envois.length = 0;
    await sendDemandeDiagnostic(makePayload());
    expect(envois[0].replyTo).toBe("marketing@rdportage.com");
  });

  it("les copies internes partent d'un expéditeur distinct de leur destinataire", async () => {
    await sendRecap(makePayload());
    expect(envois[0].from).toBeUndefined();
    expect(envois[1].from).toBe("Simulateur RD Portage <simulateur@example.com>");
  });

  it("la notification interne permet de répondre directement au lead", async () => {
    await sendDemandeDiagnostic(makePayload());
    expect(envois[1].replyTo).toBe("camille@example.com");
  });
});
