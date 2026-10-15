/**
 * RÉPONSES DU DIAGNOSTIC FLASH — le contrat de relais vers le simulateur.
 *
 * Les trois questions ne produisent plus seulement une fourchette de net :
 * elles segmentent et préremplissent le simulateur (statut, TJM, foyer). Ce module est pur — types
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

/* ————————————————————— Q3 — le foyer ————————————————————— */

/**
 * 14/10 : la 3e question porte sur le FOYER (avant : « avez-vous déjà fait
 * calculer votre taux ? », qui n'alimentait aucun calcul). C'est la promesse
 * des pubs (« ton simulateur oublie ton foyer ») et elle allège le
 * simulateur : l'écran Foyer n'affiche plus que ce qui concerne la personne,
 * et disparaît pour une personne seule sans enfant. Libellés à valider par Ridha.
 */
export const FOYER_OPTIONS = [
  { id: "seul", label: "Seul·e, sans enfant" },
  { id: "couple", label: "En couple, sans enfant" },
  { id: "enfants", label: "Avec enfant(s)" },
] as const;

export type FoyerDiag = (typeof FOYER_OPTIONS)[number]["id"];

export const isFoyerDiag = (v: unknown): v is FoyerDiag => typeof v === "string" && FOYER_OPTIONS.some((o) => o.id === v);

export const foyerLabel = (id: FoyerDiag | null | undefined): string | undefined => FOYER_OPTIONS.find((o) => o.id === id)?.label;

/* ————————————————————————— état du diagnostic ————————————————————————— */

export interface DiagnosticAnswers {
  /** Q1 — identifiant de segment. */
  segment: string | null;
  /** Q2 — identifiant de fourchette de TJM (lib/simulateur/brackets.ts). */
  tjmBracketId: string | null;
  /** Q3 — composition du foyer, préremplit l'écran Foyer du simulateur. */
  foyer: FoyerDiag | null;
}

export const EMPTY_ANSWERS: DiagnosticAnswers = { segment: null, tjmBracketId: null, foyer: null };

export const isComplete = (a: DiagnosticAnswers): boolean => Boolean(a.segment && a.tjmBracketId && a.foyer);

/** Combien des trois questions sont répondues — pilote la progression. */
export const answeredCount = (a: DiagnosticAnswers): number =>
  (a.segment ? 1 : 0) + (a.tjmBracketId ? 1 : 0) + (a.foyer ? 1 : 0);

/** Ramène un objet quelconque (localStorage, réseau) dans le domaine du valide. */
export function sanitizeAnswers(raw: unknown): DiagnosticAnswers {
  if (!raw || typeof raw !== "object") return { ...EMPTY_ANSWERS };
  const src = raw as Record<string, unknown>;
  return {
    segment: findSegment(typeof src.segment === "string" ? src.segment : null)?.id ?? null,
    tjmBracketId: findBracket(typeof src.tjmBracketId === "string" ? src.tjmBracketId : null)?.id ?? null,
    // Une ancienne réponse « déjà calculé ? » (avant le 14/10) est simplement ignorée.
    foyer: isFoyerDiag(src.foyer) ? src.foyer : null,
  };
}

/** Fourchette choisie, pour les libellés et l'estimation flash. */
export const answersBracket = (a: DiagnosticAnswers) => findBracket(a.tjmBracketId) ?? TJM_BRACKETS[1];
