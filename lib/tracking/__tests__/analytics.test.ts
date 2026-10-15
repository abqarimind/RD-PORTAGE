import { describe, expect, it } from "vitest";
import { isAnalyticsEnabled, isPlausibleGoal, PLAUSIBLE_GOALS, sanitizePlausibleProps } from "../analytics-rules";

describe("objectifs Plausible", () => {
  it("se limitent aux six objectifs définis", () => {
    expect(PLAUSIBLE_GOALS).toEqual(["diag_started", "diag_completed", "sim_started", "sim_completed", "lead_submitted", "contact_click"]);
    expect(isPlausibleGoal("diag_q1_answered")).toBe(false);
    expect(isPlausibleGoal("page_view")).toBe(false);
  });
});

describe("propriétés Plausible", () => {
  it("ne garde que angle et utm_content", () => {
    expect(sanitizePlausibleProps({ angle: "lp_b", utm_content: "B_Foyer_s04", from: "flash", tjm: "500-650", path: "/" })).toEqual({
      angle: "lp_b",
      utm_content: "B_Foyer_s04",
    });
  });

  it("refuse toute valeur qui n'est pas un identifiant technique", () => {
    expect(sanitizePlausibleProps({ angle: "500-650", utm_content: "4 200 €" })).toEqual({});
    expect(sanitizePlausibleProps({ utm_content: "jean@exemple.fr" })).toEqual({});
    expect(sanitizePlausibleProps({ utm_content: "x".repeat(65) })).toEqual({});
    expect(sanitizePlausibleProps(undefined)).toEqual({});
  });
});

describe("activation de la mesure", () => {
  it("active en production, coupée en Preview sauf drapeau de debug", () => {
    expect(isAnalyticsEnabled({ deployEnv: "production" })).toBe(true);
    expect(isAnalyticsEnabled({ deployEnv: "preview" })).toBe(false);
    expect(isAnalyticsEnabled({ deployEnv: "preview", debug: "true" })).toBe(true);
    expect(isAnalyticsEnabled({ deployEnv: "" })).toBe(false);
  });
});
