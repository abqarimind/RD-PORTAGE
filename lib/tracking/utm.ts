/**
 * Capture des UTM et du fbclid (navigateur) — sessionStorage uniquement.
 *
 * - first_touch : le premier passage de la session qui porte une
 *   attribution (utm_*, fbclid, gclid), à défaut la page d'arrivée. Immuable
 *   pendant la session.
 * - last_touch : le dernier passage qui portait une attribution.
 * Rien n'est posé en cookie : l'attribution sert au CRM via /api/lead et
 * /api/demande-diagnostic, et n'est jamais transmise à Meta (le Pixel ne lit
 * que l'URL de la page, après consentement publicitaire).
 * Convention : docs/convention-utm.md.
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

const FIRST_KEY = "rdp_first_touch";
const LAST_KEY = "rdp_last_touch";
const FBCLID_KEY = "rdp_fbclid";

/** Paramètres d'attribution reconnus dans l'URL d'arrivée. */
const ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"] as const;

/** Construit un passage à partir d'une query string (fonction pure, testée). */
export function touchFromSearch(search: string, extra: { referrer?: string; landing_path?: string; now?: string } = {}): Touch {
  const p = new URLSearchParams(search);
  const touch: Touch = { timestamp: extra.now ?? new Date().toISOString() };
  for (const key of ATTRIBUTION_KEYS) {
    const v = p.get(key);
    if (v) touch[key] = v.slice(0, 200);
  }
  if (extra.referrer) touch.referrer = extra.referrer;
  if (extra.landing_path) touch.landing_path = extra.landing_path;
  return touch;
}

export const hasAttribution = (t: Touch): boolean => ATTRIBUTION_KEYS.some((k) => Boolean(t[k]));

/**
 * Fusion pure : renvoie le nouvel état {first, last} après un passage.
 * Un passage sans attribution n'écrase jamais une attribution déjà connue.
 */
export function mergeTouch(prev: { first: Touch | null; last: Touch | null }, touch: Touch): { first: Touch; last: Touch } {
  const attributed = hasAttribution(touch);
  const first = prev.first && (hasAttribution(prev.first) || !attributed) ? prev.first : touch;
  const last = attributed || !prev.last ? touch : prev.last;
  return { first, last };
}

function currentTouch(): Touch {
  // Le referrer externe seulement : un referrer interne n'apprend rien et
  // pourrait porter une URL de page privée.
  const ref = document.referrer;
  const external = ref && !ref.startsWith(window.location.origin) ? ref.split("?")[0] : undefined;
  return touchFromSearch(window.location.search, { referrer: external, landing_path: window.location.pathname });
}

function readJson(key: string): Touch | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Touch) : null;
  } catch {
    return null;
  }
}

/** Supprime les anciens cookies / clés localStorage d'attribution (avant le passage en sessionStorage). */
function purgeLegacyStorage(): void {
  for (const name of [FIRST_KEY, LAST_KEY]) {
    document.cookie = `${name}=; max-age=0; path=/`;
  }
  try {
    localStorage.removeItem(FIRST_KEY);
    localStorage.removeItem(LAST_KEY);
    localStorage.removeItem(FBCLID_KEY);
  } catch {
    /* ignore */
  }
}

/** À appeler une fois par chargement de page (composant Tracker du layout). */
export function captureUtm(): void {
  purgeLegacyStorage();
  const touch = currentTouch();
  const next = mergeTouch({ first: readJson(FIRST_KEY), last: readJson(LAST_KEY) }, touch);
  try {
    sessionStorage.setItem(FIRST_KEY, JSON.stringify(next.first));
    sessionStorage.setItem(LAST_KEY, JSON.stringify(next.last));
    if (touch.fbclid) sessionStorage.setItem(FBCLID_KEY, touch.fbclid);
  } catch {
    /* sessionStorage indisponible : getAttribution retombe sur l'URL courante */
  }
}

export function getAttribution(): { first_touch: Touch; last_touch: Touch } {
  const fallback = currentTouch();
  return {
    first_touch: readJson(FIRST_KEY) ?? fallback,
    last_touch: readJson(LAST_KEY) ?? fallback,
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
