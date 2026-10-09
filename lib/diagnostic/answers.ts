/**
 * RÉPONSES DU DIAGNOSTIC FLASH — le contrat de relais vers le simulateur.
 *
 * Les trois questions ne produisent plus seulement une fourchette de net :
 * elles segmentent, préremplissent et réveillent. Ce module est pur — types
 * et validation — donc testable sans React.
 *
 * Le relais ne passe PLUS par l'URL (le Pixel Meta transmet l'URL de la page,
 * et la tranche de TJM est une donnée financière) : voir ./relay.ts.
 */
import type { CurrentStatus } from "@/lib/fiscal/scenarios";
import { findBracket, TJM_BRACKETS } from "@/lib/simulateur/brackets";

/* ————————————————————————— Q1 — segmenter ————————————————————————— */

/**
 * Ordre d'affichage = ordre de pertinence produit (§4.3) : porté ailleurs
 * d'abord, en transition en dernier.
 */
export interface DiagnosticSegment {
  id: string;
  label: string;
  status: CurrentStatus;
}

export const DIAGNOSTIC_SEGMENTS: DiagnosticSegment[] = [
  { id: "porte", label: "Porté chez un autre prestataire", status: "porte_ailleurs" },
  // #8 (consigne de l'équipe) : « Freelance » tout court, sans déclinaison.
  // La structure (micro / société) est demandée dans le simulateur.
  { id: "freelance", label: "Freelance", status: "freelance_micro" },
  { id: "esn", label: "Salarié en ESN", status: "salarie_esn" },
  { id: "transition", label: "En transition", status: "transition" },
];

export const findSegment = (id: string | null | undefined): DiagnosticSegment | undefined =>
  id ? DIAGNOSTIC_SEGMENTS.find((s) => s.id === id) : undefined;

/* ————————————————————— Q3 — réveiller, ne rien calculer ————————————————————— */

/**
 * Cette réponse n'alimente AUCUN calcul. Elle installe le manque que le
 * simulateur vient combler — c'est la seule des trois qui porte le Aha
 * (« personne ne t'avait jamais calculé ton vrai taux de foyer »). Elle est
 * conservée dans l'état pour l'analyse et pour moduler la formulation du
 * résultat, jamais pour pondérer un montant.
 */
export const DEJA_CALCULE_OPTIONS = [
  { id: "oui", label: "Oui" },
  { id: "non", label: "Non" },
  { id: "ignorais", label: "Je ne savais pas que c'était possible" },
] as const;

export type DejaCalcule = (typeof DEJA_CALCULE_OPTIONS)[number]["id"];

const isDejaCalcule = (v: unknown): v is DejaCalcule =>
  typeof v === "string" && DEJA_CALCULE_OPTIONS.some((o) => o.id === v);

/* ————————————————————————— état du diagnostic ————————————————————————— */

export interface DiagnosticAnswers {
  /** Q1 — identifiant de segment. */
  segment: string | null;
  /** Q2 — identifiant de fourchette de TJM (lib/simulateur/brackets.ts). */
  tjmBracketId: string | null;
  /** Q3 — n'alimente aucun calcul. */
  dejaCalcule: DejaCalcule | null;
}

export const EMPTY_ANSWERS: DiagnosticAnswers = { segment: null, tjmBracketId: null, dejaCalcule: null };

export const isComplete = (a: DiagnosticAnswers): boolean =>
  Boolean(a.segment && a.tjmBracketId && a.dejaCalcule);

/** Combien des trois questions sont répondues — pilote la progression. */
export const answeredCount = (a: DiagnosticAnswers): number =>
  (a.segment ? 1 : 0) + (a.tjmBracketId ? 1 : 0) + (a.dejaCalcule ? 1 : 0);

/** Ramène un objet quelconque (localStorage, réseau) dans le domaine du valide. */
export function sanitizeAnswers(raw: unknown): DiagnosticAnswers {
  if (!raw || typeof raw !== "object") return { ...EMPTY_ANSWERS };
  const src = raw as Record<string, unknown>;
  return {
    segment: findSegment(typeof src.segment === "string" ? src.segment : null)?.id ?? null,
    tjmBracketId: findBracket(typeof src.tjmBracketId === "string" ? src.tjmBracketId : null)?.id ?? null,
    dejaCalcule: isDejaCalcule(src.dejaCalcule) ? src.dejaCalcule : null,
  };
}

/** Fourchette choisie, pour les libellés et l'estimation flash. */
export const answersBracket = (a: DiagnosticAnswers) => findBracket(a.tjmBracketId) ?? TJM_BRACKETS[1];
