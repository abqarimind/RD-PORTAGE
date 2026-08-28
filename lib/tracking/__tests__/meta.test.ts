import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  hashEmail,
  hashPhone,
  normalizeEmail,
  normalizePhone,
  sendCapiEvent,
  sha256,
} from "../../server/capi";

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

describe("sendCapiEvent without credentials", () => {
  it("is a no-op (disabled) when env keys are unset", async () => {
    const prevId = process.env.META_PIXEL_ID;
    const prevPublic = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    const prevToken = process.env.META_CAPI_ACCESS_TOKEN;
    delete process.env.META_PIXEL_ID;
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    delete process.env.META_CAPI_ACCESS_TOKEN;

    const res = await sendCapiEvent({ eventName: "Lead", eventId: "evt-1" });
    expect(res).toEqual({ sent: false, reason: "capi_disabled" });

    if (prevId !== undefined) process.env.META_PIXEL_ID = prevId;
    if (prevPublic !== undefined) process.env.NEXT_PUBLIC_META_PIXEL_ID = prevPublic;
    if (prevToken !== undefined) process.env.META_CAPI_ACCESS_TOKEN = prevToken;
  });
});
