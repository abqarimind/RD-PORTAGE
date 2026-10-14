/**
 * Mesure d'audience sans cookie (Plausible), côté navigateur.
 *
 * Indépendante du consentement publicitaire : elle part que la bannière soit
 * acceptée, refusée ou ignorée (règles et justification : analytics-rules.ts
 * et la politique de confidentialité). Le script est chargé par le layout ;
 * ce module tient la file d'attente au cas où un objectif partirait avant.
 */
import { DEPLOY_ENV } from "@/lib/runtime-env";
import { isAnalyticsEnabled, sanitizePlausibleProps, type PlausibleGoal } from "./analytics-rules";
import { getLandingAngle } from "./journey";
import { metaContact } from "./meta";
import { getAttribution } from "./utm";

type PlausibleFn = ((event: string, options?: { props?: Record<string, string> }) => void) & {
  q?: unknown[];
  init?: (options?: unknown) => void;
  o?: unknown;
};

declare global {
  interface Window {
    plausible?: PlausibleFn;
  }
}

export const ANALYTICS_ENABLED = isAnalyticsEnabled({
  deployEnv: DEPLOY_ENV,
  debug: process.env.NEXT_PUBLIC_PLAUSIBLE_DEBUG,
});

/** Script du site sur Plausible (fourni par Ayoub le 14/10), surchargeable. */
export const PLAUSIBLE_SCRIPT_URL =
  process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT || "https://plausible.io/js/pa-Um3XuVPoX76PZHXQpHXCw.js";

/** Clé d'exclusion de l'appareil (lien « Ne pas être mesuré » de la politique de confidentialité). */
export const ANALYTICS_OPT_OUT_KEY = "rdp_no_audience";

function queue(): PlausibleFn | undefined {
  if (typeof window === "undefined") return undefined;
  // File d'attente officielle de Plausible : les appels sont rejoués au chargement du script.
  if (!window.plausible) {
    const q: PlausibleFn = (...args: unknown[]) => {
      (q.q = q.q || []).push(args);
    };
    window.plausible = q;
  }
  return window.plausible;
}

/** Objectif Plausible, avec `angle` et `utm_content` pour seules propriétés. */
export function trackGoal(goal: PlausibleGoal): void {
  if (!ANALYTICS_ENABLED) return;
  const p = queue();
  if (!p) return;
  const props = sanitizePlausibleProps({
    angle: getLandingAngle(),
    utm_content: getAttribution().first_touch.utm_content,
  });
  p(goal, Object.keys(props).length > 0 ? { props } : undefined);
}

/**
 * Clic de contact (tel:, mailto:, WhatsApp, « Nous contacter ») : objectif
 * Plausible `contact_click` dans tous les cas, `Contact` Meta seulement après
 * consentement (géré par meta.ts) et seulement quand `meta` est vrai.
 */
export function trackContact(from: string, { meta = true }: { meta?: boolean } = {}): void {
  trackGoal("contact_click");
  if (meta) metaContact(from);
}

export function setAnalyticsOptOut(optOut: boolean): void {
  try {
    if (optOut) localStorage.setItem(ANALYTICS_OPT_OUT_KEY, "1");
    else localStorage.removeItem(ANALYTICS_OPT_OUT_KEY);
  } catch {
    /* stockage indisponible : rien à mémoriser */
  }
}

export function isAnalyticsOptedOut(): boolean {
  try {
    return localStorage.getItem(ANALYTICS_OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}
