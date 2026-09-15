/**
 * ÉTAT DU SIMULATEUR — source unique de vérité (spec §4.1).
 *
 * Avant : `useState` épars dans un composant de 820 lignes, l'étape courante
 * hors de l'URL, un autosave qui restaurait l'étape sans jamais permettre de
 * repartir de zéro. C'est la cause racine commune de BUG-01, BUG-02 et
 * BUG-03 ; ce module la corrige à la racine plutôt que bug par bug.
 *
 * Ce fichier ne contient QUE des types purs et un reducer pur : il est
 * testable sans React et sans navigateur (lib/simulateur/__tests__).
 */
import type { CagnotteChoice } from "@/config/fiscal-2026";
import type { CurrentStatus } from "@/lib/fiscal/scenarios";
import { bracketForValue, findBracket, TJM_BRACKETS, type TjmBracket } from "./brackets";

/* ————————————————————————— étapes ————————————————————————— */

/**
 * Les étapes sont nommées, pas numérotées : l'URL porte `?step=foyer`, ce qui
 * rend le retour natif du navigateur (et le geste de retour mobile)
 * équivalent au bouton « Retour » de l'interface.
 *
 * Le choix des avantages reste DANS l'étape Activité : la spec §6 interdit
 * d'ajouter une étape au parcours.
 */
export const STEPS = ["profil", "activite", "foyer", "resultats", "inscription"] as const;
export type Step = (typeof STEPS)[number];

export const STEP_LABELS: Record<Step, string> = {
  profil: "Profil",
  activite: "Activité",
  foyer: "Foyer",
  resultats: "Résultats",
  inscription: "Inscription",
};

/** Étapes affichées dans la barre de progression (l'inscription est hors parcours). */
export const PROGRESS_STEPS: Step[] = ["profil", "activite", "foyer", "resultats"];

export const stepIndex = (s: Step): number => STEPS.indexOf(s);
export const isStep = (v: unknown): v is Step => typeof v === "string" && (STEPS as readonly string[]).includes(v);

/* ————————————————————————— formulaire ————————————————————————— */

export type TjmMode = "exact" | "fourchette";

export interface FormState {
  status: CurrentStatus;
  impatrie: boolean;
  /** Mode de saisie du TJM — mémorisé et restituable dans les deux sens. */
  tjmMode: TjmMode;
  /** Valeur exacte saisie. Toujours conservée, même en mode fourchette. */
  tjmExact: number;
  /** Fourchette choisie. Toujours conservée, même en mode exact. */
  tjmBracketId: string;
  days: number;
  fraisMensuels: number;
  cagnotte: CagnotteChoice;
  titresResto: boolean;
  situation: "celibataire" | "marie_pacse";
  enfants: number;
  gardeAlternee: number;
  revenuConjoint: number;
  useFraisReels: boolean;
  fraisReels: number;
  foncier: number;
  per: number;
  dons: number;
}

export const DEFAULT_FORM: FormState = {
  status: "freelance_micro",
  impatrie: false,
  tjmMode: "exact",
  tjmExact: 420,
  tjmBracketId: "350-500",
  days: 20,
  fraisMensuels: 0,
  cagnotte: "may",
  titresResto: true,
  situation: "celibataire",
  enfants: 0,
  gardeAlternee: 0,
  revenuConjoint: 0,
  useFraisReels: false,
  fraisReels: 0,
  foncier: 0,
  per: 0,
  dons: 0,
};

/**
 * TJM de calcul — dérivé, jamais stocké en double.
 * En mode fourchette : la médiane (§9.1). En mode exact : la valeur saisie.
 * C'est la SEULE fonction autorisée à répondre « quel TJM utiliser ? ».
 */
export function resolvedTjm(form: FormState): number {
  if (form.tjmMode === "fourchette") {
    return (findBracket(form.tjmBracketId) ?? TJM_BRACKETS[1]).mediane;
  }
  return form.tjmExact;
}

/** Fourchette active (mode fourchette) ou fourchette contenant la valeur exacte. */
export function activeBracket(form: FormState): TjmBracket {
  return form.tjmMode === "fourchette"
    ? (findBracket(form.tjmBracketId) ?? TJM_BRACKETS[1])
    : bracketForValue(form.tjmExact);
}

/* ————————————————————————— état global ————————————————————————— */

export interface SimulatorState {
  step: Step;
  form: FormState;
  /** Étapes déjà validées — permet de revenir en avant sans tout ressaisir. */
  visited: Step[];
  /** Lead soumis avec succès : débloque le dossier. */
  unlocked: boolean;
  leadId: string | null;
  /** Identifiant stable de la simulation courante (clé d'idempotence email). */
  simulationId: string;
  /** Horodatage de création de la simulation courante. */
  startedAt: string;
}

export function createInitialState(simulationId: string, now = new Date()): SimulatorState {
  return {
    step: "profil",
    form: { ...DEFAULT_FORM },
    visited: ["profil"],
    unlocked: false,
    leadId: null,
    simulationId,
    startedAt: now.toISOString(),
  };
}

/* ————————————————————————— actions ————————————————————————— */

export type SimulatorAction =
  | { type: "set_field"; key: keyof FormState; value: FormState[keyof FormState] }
  | { type: "set_profile"; status: CurrentStatus; impatrie: boolean }
  | { type: "set_tjm_mode"; mode: TjmMode }
  | { type: "set_tjm_exact"; value: number }
  | { type: "set_tjm_bracket"; id: string }
  | { type: "go_to"; step: Step }
  | { type: "unlock"; leadId: string }
  | { type: "reset"; simulationId: string; now?: string }
  | { type: "restore"; state: SimulatorState };

export function reducer(state: SimulatorState, action: SimulatorAction): SimulatorState {
  switch (action.type) {
    case "set_field": {
      const form = { ...state.form, [action.key]: action.value } as FormState;
      // Garde-fou : la garde alternée ne peut pas dépasser le nombre d'enfants.
      if (action.key === "enfants") form.gardeAlternee = Math.min(form.gardeAlternee, form.enfants);
      return { ...state, form };
    }

    case "set_profile":
      return { ...state, form: { ...state.form, status: action.status, impatrie: action.impatrie } };

    /**
     * Basculer de mode ne détruit JAMAIS l'autre saisie (BUG-02) :
     * - exact → fourchette : on pré-sélectionne la fourchette qui contient la
     *   valeur exacte, pour ne pas perdre l'ordre de grandeur ;
     * - fourchette → exact : si aucune saisie exacte n'existe encore, on
     *   amorce le champ avec la médiane de la fourchette.
     */
    case "set_tjm_mode": {
      if (action.mode === state.form.tjmMode) return state;
      const form = { ...state.form, tjmMode: action.mode };
      if (action.mode === "fourchette") {
        form.tjmBracketId = bracketForValue(state.form.tjmExact).id;
      } else {
        form.tjmExact = state.form.tjmExact || activeBracket(state.form).mediane;
      }
      return { ...state, form };
    }

    case "set_tjm_exact":
      return { ...state, form: { ...state.form, tjmMode: "exact", tjmExact: action.value } };

    case "set_tjm_bracket":
      return { ...state, form: { ...state.form, tjmMode: "fourchette", tjmBracketId: action.id } };

    case "go_to": {
      const visited = state.visited.includes(action.step) ? state.visited : [...state.visited, action.step];
      return { ...state, step: action.step, visited };
    }

    case "unlock":
      return { ...state, unlocked: true, leadId: action.leadId };

    /** « Nouvelle simulation » — remise à zéro totale et explicite (BUG-03). */
    case "reset":
      return createInitialState(action.simulationId, action.now ? new Date(action.now) : undefined);

    case "restore":
      return action.state;
  }
}
