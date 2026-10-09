import { describe, expect, it } from "vitest";
import { hasAttribution, mergeTouch, touchFromSearch } from "../utm";

const now = "2026-10-09T10:00:00.000Z";

describe("capture UTM / fbclid", () => {
  it("lit les paramètres d'attribution, et eux seuls", () => {
    const t = touchFromSearch("?utm_source=facebook&utm_campaign=lancement&fbclid=AbC&step=foyer&t=350-500", { now });
    expect(t).toEqual({ utm_source: "facebook", utm_campaign: "lancement", fbclid: "AbC", timestamp: now });
  });

  it("le premier passage attribué de la session est conservé", () => {
    const ads = touchFromSearch("?utm_source=facebook&fbclid=1", { now, landing_path: "/lp/b" });
    const interne = touchFromSearch("", { now, landing_path: "/simulateur" });
    let s = mergeTouch({ first: null, last: null }, ads);
    s = mergeTouch(s, interne);
    expect(s.first).toBe(ads);
    expect(s.last).toBe(ads); // une page sans UTM n'écrase pas l'attribution
  });

  it("une arrivée directe puis publicitaire : l'attribution remplace l'arrivée vierge", () => {
    const direct = touchFromSearch("", { now, landing_path: "/" });
    const ads = touchFromSearch("?utm_source=instagram", { now });
    const s = mergeTouch(mergeTouch({ first: null, last: null }, direct), ads);
    expect(s.first).toBe(ads);
    expect(hasAttribution(s.first)).toBe(true);
  });
});
