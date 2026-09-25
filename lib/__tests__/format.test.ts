import { describe, expect, it } from "vitest";
import { groupFr, NBSP } from "@/lib/format";

describe("groupFr", () => {
  it("sépare les milliers par une espace insécable visible, jamais l'espace fine", () => {
    expect(groupFr(63681)).toBe(`63${NBSP}681`);
    expect(groupFr(1234567.4)).toBe(`1${NBSP}234${NBSP}567`);
    expect(groupFr(63681)).not.toContain(" ");
  });
});
