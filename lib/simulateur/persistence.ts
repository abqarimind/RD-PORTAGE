/**
 * Autosave / restauration de l'état du simulateur (spec §4.1).
 *
 * Trois garanties :
 *  1. TTL de 7 jours — au-delà, on repart proprement d'un état vide.
 *  2. Tolérance de schéma — un état enregistré dans un format inconnu ne doit
 *     JAMAIS faire planter l'écran : en cas de doute, on repart de zéro.
 *  3. Aucune exception ne remonte — localStorage peut être indisponible
 *     (navigation privée, stockage bloqué, quota) : le simulateur doit
 *     fonctionner sans, simplement sans reprise.
 */
import { createInitialState, DEFAULT_FORM, isStep, type FormState, type SimulatorState } from "./state";

export const STORAGE_KEY = "rdp_sim_state_v2";
/** L'ancienne clé v1 ne portait ni version, ni TTL, ni mode de saisie TJM. */
const LEGACY_KEY = "rdp_sim_state";
export const SCHEMA_VERSION = 2;
export const TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface Envelope {
  v: number;
  savedAt: string;
  state: SimulatorState;
}

export function saveState(state: SimulatorState): void {
  try {
    const envelope: Envelope = { v: SCHEMA_VERSION, savedAt: new Date().toISOString(), state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    /* stockage indisponible — la simulation continue sans reprise */
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Restaure un état sauvegardé, ou renvoie null s'il n'y en a pas d'exploitable.
 * Ne lève jamais.
 */
export function loadState(now = Date.now()): SimulatorState | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) {
    // Un état v1 traîne peut-être : on le purge sans tenter de le migrer (il
    // ne contenait pas le mode de saisie du TJM, donc rien de fiable à
    // reprendre). Repartir proprement vaut mieux qu'un état à moitié juste.
    clearState();
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Envelope>;
    if (!parsed || parsed.v !== SCHEMA_VERSION || !parsed.state || !parsed.savedAt) {
      clearState();
      return null;
    }
    if (now - new Date(parsed.savedAt).getTime() > TTL_MS) {
      clearState();
      return null;
    }
    return sanitize(parsed.state);
  } catch {
    clearState();
    return null;
  }
}

/**
 * Ramène un état potentiellement altéré dans le domaine du valide. Tout champ
 * absent ou d'un type inattendu reprend sa valeur par défaut — le simulateur
 * doit démarrer même sur un localStorage bricolé à la main.
 */
function sanitize(candidate: SimulatorState): SimulatorState | null {
  if (typeof candidate !== "object" || candidate === null) return null;

  const base = createInitialState(
    typeof candidate.simulationId === "string" && candidate.simulationId ? candidate.simulationId : newSimulationId(),
  );
  const form: FormState = { ...DEFAULT_FORM };

  const saved = (candidate.form ?? {}) as unknown as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_FORM) as (keyof FormState)[]) {
    const value = saved[key];
    if (typeof value === typeof DEFAULT_FORM[key] && value !== null && value !== undefined) {
      // Les nombres non finis (NaN, Infinity) sont rejetés : ils sont la
      // source silencieuse des écrans à « NaN € » (spec §4.2).
      if (typeof value === "number" && !Number.isFinite(value)) continue;
      (form[key] as unknown) = value;
    }
  }
  form.gardeAlternee = Math.min(form.gardeAlternee, form.enfants);

  return {
    ...base,
    form,
    step: isStep(candidate.step) ? candidate.step : "profil",
    visited: Array.isArray(candidate.visited) ? candidate.visited.filter(isStep) : ["profil"],
    unlocked: candidate.unlocked === true,
    leadId: typeof candidate.leadId === "string" ? candidate.leadId : null,
    startedAt: typeof candidate.startedAt === "string" ? candidate.startedAt : base.startedAt,
  };
}

/** Identifiant de simulation — crypto.randomUUID avec repli universel. */
export function newSimulationId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return `sim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
