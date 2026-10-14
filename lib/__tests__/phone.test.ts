import { describe, expect, it } from "vitest";
import { formatPhone, isValidPhone, normalizePhone } from "@/lib/phone";

describe("normalizePhone — formats français", () => {
  it.each([
    ["06 12 34 56 78", "+33612345678"],
    ["0612345678", "+33612345678"],
    ["06.12.34.56.78", "+33612345678"],
    ["06-12-34-56-78", "+33612345678"],
    ["  07 81 22 33 44 ", "+33781223344"],
    ["01 71 49 71 57", "+33171497157"],
    ["+33 6 12 34 56 78", "+33612345678"],
    ["+33612345678", "+33612345678"],
    ["+33 (0)6 12 34 56 78", "+33612345678"],
    ["+33 06 12 34 56 78", "+33612345678"],
    ["0033 6 12 34 56 78", "+33612345678"],
  ])("%s → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });
});

describe("normalizePhone — international", () => {
  it.each([
    ["+44 7911 123456", "+447911123456"],
    ["0044 7911 123456", "+447911123456"],
    ["+1 (415) 555-2671", "+14155552671"],
    ["+212 6 61 23 45 67", "+212661234567"],
    ["+32 470 12 34 56", "+32470123456"],
  ])("%s → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });
});

describe("normalizePhone — refus", () => {
  it.each([
    [""],
    ["   "],
    ["06 12 34 56"], // trop court
    ["06 12 34 56 78 9"], // trop long
    ["00 12 34 56 78"], // national commençant par 00 → international invalide
    ["6 12 34 56 78"], // sans le 0
    ["+33 6 12 34 56"], // +33 trop court
    ["+0 123 456 789"],
    ["06 12 AB 56 78"],
    ["jean@exemple.fr"],
    ["+1234567"], // 7 chiffres
  ])("« %s » est refusé", (input) => {
    expect(normalizePhone(input)).toBeNull();
    expect(isValidPhone(input)).toBe(false);
  });

  it("ne lève jamais sur une entrée non textuelle", () => {
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(612345678 as unknown as string)).toBeNull();
  });
});

describe("formatPhone", () => {
  it("met en forme un numéro français", () => {
    expect(formatPhone("+33612345678")).toBe("+33 6 12 34 56 78");
  });
  it("laisse un numéro étranger en E.164", () => {
    expect(formatPhone("+447911123456")).toBe("+447911123456");
  });
});
