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
import { findSegment, type DiagnosticAnswers } from "@/lib/diagnostic/answers";

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
  /**
   * Aucune présélection (§4.3). Le profil détermine l'intégralité du calcul :
   * il doit être un choix explicite, jamais un défaut hérité. « freelance_micro »
   * était à la fois la valeur par défaut et le premier élément de la liste, si
   * bien que le chemin le plus fréquent du simulateur menait au seul résultat
   * qui dessert le produit. Un parcours ne peut plus avancer sans profil.
   */
  status: CurrentStatus | null;
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
  status: null,
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
 * VALIDATION D'UN FORMULAIRE VENU DE L'EXTÉRIEUR — source unique.
 *
 * Utilisée par la restauration localStorage ET par les routes d'API : les deux
 * reçoivent un objet non fiable et doivent le ramener dans le domaine du
 * valide, exactement de la même façon.
 *
 * Elle remplace une comparaison `typeof v === typeof DEFAULT_FORM[k]` qui
 * paraissait générique mais était fausse : depuis que `status` n'a plus de
 * valeur par défaut, `typeof DEFAULT_FORM.status` vaut "object" (typeof null),
 * si bien qu'un profil transmis sous forme de chaîne était systématiquement
 * rejeté. Conséquence : profil perdu au rechargement, et récapitulatif jugé
 * non calculable côté serveur — donc aucun email ni lien de dossier.
 * Une règle par champ, explicite, coûte quelques lignes et ne ment pas.
 */
const STATUTS: CurrentStatus[] = ["salarie_esn", "freelance_micro", "freelance_sasu", "porte_ailleurs", "transition"];

export function coerceFormState(raw: unknown): FormState {
  const form: FormState = { ...DEFAULT_FORM };
  if (!raw || typeof raw !== "object") return form;
  const src = raw as Record<string, unknown>;

  const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
    typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;

  // Le profil est le seul champ nullable : absent ou inconnu, il reste nul, et
  // l'invariant anti-zéro refusera le calcul en le nommant.
  form.status = typeof src.status === "string" && (STATUTS as string[]).includes(src.status) ? (src.status as CurrentStatus) : null;
  form.impatrie = bool(src.impatrie, DEFAULT_FORM.impatrie);
  form.tjmMode = oneOf(src.tjmMode, ["exact", "fourchette"] as const, DEFAULT_FORM.tjmMode);
  form.tjmExact = num(src.tjmExact, DEFAULT_FORM.tjmExact);
  form.tjmBracketId = findBracket(typeof src.tjmBracketId === "string" ? src.tjmBracketId : null)?.id ?? DEFAULT_FORM.tjmBracketId;
  form.days = num(src.days, DEFAULT_FORM.days);
  form.fraisMensuels = num(src.fraisMensuels, DEFAULT_FORM.fraisMensuels);
  form.cagnotte = oneOf(src.cagnotte, ["may", "wawashi", "aucune"] as const, DEFAULT_FORM.cagnotte);
  form.titresResto = bool(src.titresResto, DEFAULT_FORM.titresResto);
  form.situation = oneOf(src.situation, ["celibataire", "marie_pacse"] as const, DEFAULT_FORM.situation);
  form.enfants = num(src.enfants, DEFAULT_FORM.enfants);
  form.gardeAlternee = num(src.gardeAlternee, DEFAULT_FORM.gardeAlternee);
  form.revenuConjoint = num(src.revenuConjoint, DEFAULT_FORM.revenuConjoint);
  form.useFraisReels = bool(src.useFraisReels, DEFAULT_FORM.useFraisReels);
  form.fraisReels = num(src.fraisReels, DEFAULT_FORM.fraisReels);
  form.foncier = num(src.foncier, DEFAULT_FORM.foncier);
  form.per = num(src.per, DEFAULT_FORM.per);
  form.dons = num(src.dons, DEFAULT_FORM.dons);

  form.gardeAlternee = Math.min(form.gardeAlternee, form.enfants);
  return form;
}

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
  /**
   * Champs préremplis par le diagnostic flash. Sert à les marquer
   * visuellement (§3.3) : si l'utilisateur ne voit pas que ses réponses ont
   * été gardées, le bénéfice de les avoir gardées est perdu.
   */
  prefilled: { status: boolean; tjm: boolean };
  /**
   * Réponse à la 3e question du diagnostic. N'alimente AUCUN calcul :
   * conservée pour l'analyse et pour moduler la formulation du résultat.
   */
  dejaCalcule: string | null;
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
    prefilled: { status: false, tjm: false },
    dejaCalcule: null,
  };
}

/* ————————————————————————— actions ————————————————————————— */

export type SimulatorAction =
  | { type: "set_field"; key: keyof FormState; value: FormState[keyof FormState] }
  | { type: "set_profile"; status: CurrentStatus; impatrie: boolean }
  | { type: "apply_diagnostic"; answers: DiagnosticAnswers }
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

    // Choisir soi-même lève la marque « prérempli » : le champ n'est plus
    // hérité du diagnostic, il est assumé par l'utilisateur.
    case "set_profile":
      return {
        ...state,
        form: { ...state.form, status: action.status, impatrie: action.impatrie },
        prefilled: { ...state.prefilled, status: false },
      };

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
      return {
        ...state,
        form: { ...state.form, tjmMode: "exact", tjmExact: action.value },
        prefilled: { ...state.prefilled, tjm: false },
      };

    case "set_tjm_bracket":
      return {
        ...state,
        form: { ...state.form, tjmMode: "fourchette", tjmBracketId: action.id },
        prefilled: { ...state.prefilled, tjm: false },
      };

    /**
     * Applique le relais du diagnostic flash. Préremplir n'est pas
     * verrouiller : les champs restent modifiables partout. Une réponse
     * absente ou invalide est simplement ignorée — jamais d'écran cassé.
     */
    case "apply_diagnostic": {
      const segment = findSegment(action.answers.segment);
      const bracket = findBracket(action.answers.tjmBracketId);
      const form = { ...state.form };
      if (segment) {
        form.status = segment.status;
        form.impatrie = false;
      }
      if (bracket) {
        form.tjmMode = "fourchette";
        form.tjmBracketId = bracket.id;
      }
      return {
        ...state,
        form,
        prefilled: { status: Boolean(segment), tjm: Boolean(bracket) },
        dejaCalcule: action.answers.dejaCalcule ?? state.dejaCalcule,
      };
    }

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
