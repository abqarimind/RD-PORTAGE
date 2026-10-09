/**
 * Règles pures du Pixel Meta — sans DOM, donc testables sous Vitest (node).
 *
 * Deux garde-fous, appliqués à CHAQUE appel fbq :
 *  1. Paramètres : liste fermée de clés et de valeurs « courtes et
 *     techniques ». Meta interdit de lui transmettre des données financières
 *     ou familiales (TJM, CA, revenus, impôt, foyer, enfants, PER, résultats) ;
 *     une liste blanche est la seule protection qui ne dépend pas de la
 *     vigilance de chaque appelant.
 *  2. URL : le Pixel transmet l'URL de la page (paramètre `dl`). Aucun
 *     événement ne part depuis une page exclue, ni depuis une URL qui porte un
 *     paramètre hors liste blanche (ex. ancien relais `?t=350-500`, lien de
 *     dossier `?d=…`).
 */

/** Événements autorisés : standards Meta (fbq 'track') puis personnalisés ('trackCustom'). */
export const META_STANDARD_EVENTS = ["PageView", "ViewContent", "Lead", "Schedule", "Contact"] as const;
export const META_CUSTOM_EVENTS = ["DiagnosticFlashStart", "DiagnosticFlashComplete", "SimulateurFoyerComplete"] as const;

export type MetaStandardEvent = (typeof META_STANDARD_EVENTS)[number];
export type MetaCustomEvent = (typeof META_CUSTOM_EVENTS)[number];
export type MetaEventName = MetaStandardEvent | MetaCustomEvent;

export const isStandardEvent = (e: string): e is MetaStandardEvent =>
  (META_STANDARD_EVENTS as readonly string[]).includes(e);
export const isMetaEvent = (e: string): e is MetaEventName =>
  isStandardEvent(e) || (META_CUSTOM_EVENTS as readonly string[]).includes(e);

/** Seules clés de paramètres transmissibles à Meta. */
export const ALLOWED_PARAM_KEYS = ["content_name", "step", "from"] as const;
export type MetaParams = Partial<Record<(typeof ALLOWED_PARAM_KEYS)[number], string>>;

/** Identifiant technique : lettres, chiffres, `_` et `-`, 64 caractères au plus. Pas de chiffre seul. */
const SAFE_VALUE = /^(?=.*[a-z_])[a-z0-9_-]{1,64}$/i;

/** Ne garde que les clés autorisées dont la valeur est un identifiant technique. */
export function sanitizeParams(raw: Record<string, unknown> | undefined): MetaParams {
  const out: MetaParams = {};
  if (!raw) return out;
  for (const key of ALLOWED_PARAM_KEYS) {
    const v = raw[key];
    if (typeof v === "string" && SAFE_VALUE.test(v)) out[key] = v;
  }
  return out;
}

/** Pages où le Pixel ne doit jamais rien envoyer. */
export const META_EXCLUDED_PATHS = ["/dossier", "/confidentialite", "/mentions-legales"];

/**
 * Paramètres d'URL tolérés : attribution publicitaire, étape du simulateur
 * (un nom d'écran, pas une valeur) et variantes de landing.
 */
export const ALLOWED_QUERY_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "step",
  "v",
  "nav",
]);

export function isExcludedPath(pathname: string): boolean {
  return META_EXCLUDED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Vrai si une URL peut être vue par Meta : page non exclue et query string sans valeur inconnue. */
export function isUrlSafeForMeta(href: string): boolean {
  let url: URL;
  try {
    url = new URL(href, "https://simulateur.rdportage.com");
  } catch {
    return false;
  }
  if (isExcludedPath(url.pathname)) return false;
  for (const key of url.searchParams.keys()) {
    if (!ALLOWED_QUERY_KEYS.has(key)) return false;
  }
  return true;
}

/**
 * Le Pixel n'est actif qu'en production, ou en local quand
 * NEXT_PUBLIC_META_PIXEL_DEBUG=true. `off` dans l'ID le coupe partout.
 */
export function isPixelEnabled(env: { nodeEnv?: string; pixelId?: string; debug?: string }): boolean {
  if (!env.pixelId || env.pixelId === "off") return false;
  return env.nodeEnv === "production" || env.debug === "true";
}
