import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  hashEmail,
  hashPhone,
  normalizeEmail,
  normalizePhone,
  isCapiEnabled,
  sendCapiEvent,
  sha256,
} from "../../server/capi";
import { isMetaEvent, isPixelEnabled, isStandardEvent, isUrlSafeForMeta, sanitizeParams } from "../meta-rules";

const sha = (v: string) => createHash("sha256").update(v).digest("hex");

describe("CAPI PII normalisation", () => {
  it("normalises email: trim + lowercase", () => {
    expect(normalizeEmail("  Jean.Dupont@Example.COM ")).toBe("jean.dupont@example.com");
  });

  it("normalises FR phone: digits only, leading 0 → 33", () => {
    expect(normalizePhone("06 32 98 87 23")).toBe("33632988723");
    expect(normalizePhone("+33 6 32 98 87 23")).toBe("33632988723");
    expect(normalizePhone("0632988723")).toBe("33632988723");
  });

  it("keeps an already international number untouched (digits only)", () => {
    expect(normalizePhone("33632988723")).toBe("33632988723");
  });
});

describe("CAPI hashing", () => {
  it("sha256 is the hex digest, 64 chars", () => {
    const h = sha256("hello");
    expect(h).toHaveLength(64);
    expect(h).toBe(sha("hello"));
  });

  it("hashEmail hashes the normalised value", () => {
    expect(hashEmail("Jean.Dupont@Example.COM")).toEqual([sha("jean.dupont@example.com")]);
  });

  it("hashPhone hashes the normalised value", () => {
    expect(hashPhone("06 32 98 87 23")).toEqual([sha("33632988723")]);
  });

  it("returns undefined for missing PII", () => {
    expect(hashEmail(undefined)).toBeUndefined();
    expect(hashPhone(undefined)).toBeUndefined();
  });
});

describe("sendCapiEvent — préparé, non activé", () => {
  const KEYS = ["META_CAPI_ENABLED", "META_CAPI_TOKEN", "META_CAPI_ACCESS_TOKEN"] as const;
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => KEYS.forEach((k) => ((saved[k] = process.env[k]), delete process.env[k])));
  afterEach(() => KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]))));

  it("no-op sans token", async () => {
    expect(await sendCapiEvent({ eventName: "Lead", eventId: "evt-1" })).toEqual({ sent: false, reason: "capi_disabled" });
  });

  it("no-op avec un token mais sans META_CAPI_ENABLED=true", async () => {
    process.env.META_CAPI_TOKEN = "token-de-test";
    expect(isCapiEnabled()).toBe(false);
    expect(await sendCapiEvent({ eventName: "Lead", eventId: "evt-1" })).toEqual({ sent: false, reason: "capi_disabled" });
  });

  it("activée seulement avec les deux variables", () => {
    process.env.META_CAPI_TOKEN = "token-de-test";
    process.env.META_CAPI_ENABLED = "true";
    expect(isCapiEnabled()).toBe(true);
  });
});

describe("paramètres transmis à Meta — liste blanche", () => {
  it("ne garde que content_name, step et from", () => {
    expect(
      sanitizeParams({
        content_name: "simulateur_dossier",
        step: "flash",
        from: "lp_pricing_tel",
        value: 1234,
        currency: "EUR",
        tjm: "500",
        low: 4200,
        high: 5100,
        situation: "marie",
        enfants: 2,
        garde_alternee: true,
        per: 3000,
        email: "a@b.fr",
      }),
    ).toEqual({ content_name: "simulateur_dossier", step: "flash", from: "lp_pricing_tel" });
  });

  it("refuse une valeur chiffrée ou libre même sous une clé autorisée", () => {
    expect(sanitizeParams({ content_name: "4500" })).toEqual({});
    expect(sanitizeParams({ content_name: "350-500" })).toEqual({});
    expect(sanitizeParams({ content_name: "4 500 €" })).toEqual({});
    expect(sanitizeParams({ from: "a@b.fr" })).toEqual({});
    expect(sanitizeParams({ step: 3 })).toEqual({});
  });

  it("ne connaît que les événements du plan de marquage", () => {
    for (const e of ["PageView", "ViewContent", "Lead", "Schedule", "Contact", "DiagnosticFlashStart", "DiagnosticFlashComplete", "SimulateurFoyerComplete"]) {
      expect(isMetaEvent(e)).toBe(true);
    }
    for (const e of ["SimulateurStart", "DiagnosticComplete", "CompleteRegistration", "Purchase"]) {
      expect(isMetaEvent(e)).toBe(false);
    }
    expect(isStandardEvent("Lead")).toBe(true);
    expect(isStandardEvent("DiagnosticFlashStart")).toBe(false);
  });
});

describe("URL vue par Meta", () => {
  it("pages exclues", () => {
    expect(isUrlSafeForMeta("https://simulateur.rdportage.com/dossier?d=abc&s=def")).toBe(false);
    expect(isUrlSafeForMeta("https://simulateur.rdportage.com/dossier")).toBe(false);
    expect(isUrlSafeForMeta("https://simulateur.rdportage.com/confidentialite")).toBe(false);
    expect(isUrlSafeForMeta("https://simulateur.rdportage.com/mentions-legales")).toBe(false);
  });

  it("refuse l'ancien relais du diagnostic dans l'URL", () => {
    expect(isUrlSafeForMeta("https://simulateur.rdportage.com/simulateur?from=diag&p=porte&t=350-500&q3=non")).toBe(false);
    expect(isUrlSafeForMeta("https://simulateur.rdportage.com/simulateur?t=350-500")).toBe(false);
  });

  it("accepte les pages du parcours, l'étape et l'attribution", () => {
    expect(isUrlSafeForMeta("https://simulateur.rdportage.com/")).toBe(true);
    expect(isUrlSafeForMeta("https://simulateur.rdportage.com/lp/b?v=vsl&utm_source=facebook&fbclid=xyz")).toBe(true);
    expect(isUrlSafeForMeta("https://simulateur.rdportage.com/simulateur?step=resultats")).toBe(true);
  });
});

describe("activation du Pixel", () => {
  it("actif en production, inactif en local sauf debug", () => {
    expect(isPixelEnabled({ nodeEnv: "production", pixelId: "4019768748330072" })).toBe(true);
    expect(isPixelEnabled({ nodeEnv: "development", pixelId: "4019768748330072" })).toBe(false);
    expect(isPixelEnabled({ nodeEnv: "development", pixelId: "4019768748330072", debug: "true" })).toBe(true);
    expect(isPixelEnabled({ nodeEnv: "production", pixelId: "off" })).toBe(false);
  });
});
