/**
 * UTM capture & persistence (client side).
 * first_touch: immutable, 90-day first-party cookie.
 * last_touch: overwritten at each session.
 * Convention: docs/convention-utm.md.
 */
export interface Touch {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_path?: string;
  gclid?: string;
  fbclid?: string;
  timestamp: string;
}

const FIRST_COOKIE = "rdp_first_touch";
const LAST_COOKIE = "rdp_last_touch";
const NINETY_DAYS = 90 * 24 * 3600;

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; samesite=lax`;
}

function currentTouch(): Touch {
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get("utm_source") ?? undefined,
    utm_medium: p.get("utm_medium") ?? undefined,
    utm_campaign: p.get("utm_campaign") ?? undefined,
    utm_term: p.get("utm_term") ?? undefined,
    utm_content: p.get("utm_content") ?? undefined,
    gclid: p.get("gclid") ?? undefined,
    fbclid: p.get("fbclid") ?? undefined,
    referrer: document.referrer || undefined,
    landing_path: window.location.pathname,
    timestamp: new Date().toISOString(),
  };
}

/** Call once per page load (Tracker component in app/layout.tsx). */
export function captureUtm(): void {
  const touch = currentTouch();
  if (!readCookie(FIRST_COOKIE)) {
    writeCookie(FIRST_COOKIE, JSON.stringify(touch), NINETY_DAYS);
  }
  writeCookie(LAST_COOKIE, JSON.stringify(touch), NINETY_DAYS);
}

export function getAttribution(): { first_touch: Touch; last_touch: Touch } {
  const fallback = currentTouch();
  const parse = (raw: string | null): Touch => {
    try {
      return raw ? (JSON.parse(raw) as Touch) : fallback;
    } catch {
      return fallback;
    }
  };
  return {
    first_touch: parse(readCookie(FIRST_COOKIE)),
    last_touch: parse(readCookie(LAST_COOKIE)),
  };
}

/** lead_source derivation from first-touch UTM (convention-utm.md). */
export function deriveLeadSource(first: Touch):
  | "froid_seo"
  | "froid_ads"
  | "froid_linkedin"
  | "froid_youtube"
  | "chaud_coldcall"
  | "chaud_cooptation"
  | "direct" {
  const src = first.utm_source ?? "";
  const medium = first.utm_medium ?? "";
  if (src === "coldcall") return "chaud_coldcall";
  if (src === "cooptation") return "chaud_cooptation";
  if (src === "linkedin") return "froid_linkedin";
  if (src === "youtube") return "froid_youtube";
  if (medium === "cpc" || first.gclid) return "froid_ads";
  if (medium === "organic" || first.referrer?.includes("google.")) return "froid_seo";
  return "direct";
}

export function deviceType(): "mobile" | "desktop" {
  return window.matchMedia("(max-width: 768px)").matches ? "mobile" : "desktop";
}
