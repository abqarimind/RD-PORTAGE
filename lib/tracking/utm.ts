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

const FBCLID_KEY = "rdp_fbclid";

/** Call once per page load (Tracker component in app/layout.tsx). */
export function captureUtm(): void {
  const touch = currentTouch();
  if (!readCookie(FIRST_COOKIE)) {
    writeCookie(FIRST_COOKIE, JSON.stringify(touch), NINETY_DAYS);
  }
  writeCookie(LAST_COOKIE, JSON.stringify(touch), NINETY_DAYS);
  // Mirror to localStorage so attribution survives even when third-party
  // cookies are restricted, and keep the raw fbclid for Meta fbc rebuild.
  try {
    if (!localStorage.getItem(FIRST_COOKIE)) localStorage.setItem(FIRST_COOKIE, JSON.stringify(touch));
    localStorage.setItem(LAST_COOKIE, JSON.stringify(touch));
    if (touch.fbclid) localStorage.setItem(FBCLID_KEY, touch.fbclid);
  } catch {
    /* localStorage may be unavailable (private mode) — cookies are enough. */
  }
}

/** Raw fbclid (current URL, else last stored) — used to rebuild Meta's _fbc. */
export function getStoredFbclid(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const fromUrl = new URLSearchParams(window.location.search).get("fbclid");
  if (fromUrl) return fromUrl;
  try {
    return localStorage.getItem(FBCLID_KEY) ?? undefined;
  } catch {
    return undefined;
  }
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
  // Meta (Facebook/Instagram) paid traffic folds into froid_ads (closed enum).
  if (src === "facebook" || src === "instagram" || src === "meta" || first.fbclid) return "froid_ads";
  if (medium === "cpc" || medium === "paid_social" || first.gclid) return "froid_ads";
  if (medium === "organic" || first.referrer?.includes("google.")) return "froid_seo";
  return "direct";
}

export function deviceType(): "mobile" | "desktop" {
  return window.matchMedia("(max-width: 768px)").matches ? "mobile" : "desktop";
}
