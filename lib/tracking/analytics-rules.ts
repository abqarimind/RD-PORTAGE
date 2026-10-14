/**
 * Règles pures de la mesure d'audience sans cookie (Plausible) — testables
 * sous Vitest, sans DOM.
 *
 * Cette mesure fonctionne même quand la bannière est refusée : c'est ce qui
 * la rend exemptable de consentement (CNIL), à condition qu'elle reste
 * strictement statistique. D'où deux listes fermées :
 *  - six objectifs, pas un de plus ;
 *  - deux propriétés, `angle` et `utm_content`, qui décrivent la publicité
 *    et l'écran d'arrivée, jamais la personne ni sa simulation.
 */

export const PLAUSIBLE_GOALS = [
  "diag_started",
  "diag_completed",
  "sim_started",
  "sim_completed",
  "lead_submitted",
  "contact_click",
] as const;
export type PlausibleGoal = (typeof PLAUSIBLE_GOALS)[number];

export const isPlausibleGoal = (e: string): e is PlausibleGoal => (PLAUSIBLE_GOALS as readonly string[]).includes(e);

export const PLAUSIBLE_PROP_KEYS = ["angle", "utm_content"] as const;
export type PlausibleProps = Partial<Record<(typeof PLAUSIBLE_PROP_KEYS)[number], string>>;

/** Identifiant technique : lettres, chiffres, `_` et `-`, 64 caractères au plus, au moins une lettre. */
const SAFE_VALUE = /^(?=.*[a-z])[a-z0-9_-]{1,64}$/i;

/** Ne garde que `angle` et `utm_content`, et seulement si leur valeur est un identifiant technique. */
export function sanitizePlausibleProps(raw: Record<string, unknown> | undefined): PlausibleProps {
  const out: PlausibleProps = {};
  if (!raw) return out;
  for (const key of PLAUSIBLE_PROP_KEYS) {
    const v = raw[key];
    if (typeof v === "string" && SAFE_VALUE.test(v)) out[key] = v;
  }
  return out;
}

/*
 * Filtrage de l'URL (chemin + UTM seulement, /dossier sans aucun paramètre) :
 * fait par `transformRequest` dans app/layout.tsx, au plus près de l'envoi,
 * et vérifié de bout en bout par e2e/tracking.spec.ts.
 */

/** Mesure active en production, ou partout avec NEXT_PUBLIC_PLAUSIBLE_DEBUG=true (Preview de test, CI). */
export function isAnalyticsEnabled(env: { deployEnv?: string; debug?: string }): boolean {
  return env.deployEnv === "production" || env.debug === "true";
}
