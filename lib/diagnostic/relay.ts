/**
 * RELAIS DIAGNOSTIC FLASH → SIMULATEUR, sans passer par l'URL.
 *
 * Le relais voyageait auparavant dans la query string (`?from=diag&p=…&t=…`).
 * Or le Pixel Meta transmet l'URL de la page : la tranche de TJM y serait
 * partie. Les réponses passent donc par deux canaux, jamais par l'URL :
 *  1. une variable de module : la navigation interne (next/link) ne recharge
 *     pas le JavaScript, le simulateur la lit même si le stockage est bloqué ;
 *  2. localStorage, pour un rechargement ou un nouvel onglet.
 * Le relais est CONSOMMÉ à la lecture : une visite ultérieure directe sur
 * /simulateur ne rejoue pas un préremplissage ancien. Courte durée de vie
 * pour la même raison.
 */
import { answeredCount, sanitizeAnswers, type DiagnosticAnswers } from "./answers";

const RELAY_KEY = "rdp_diag_relay_v1";
export const RELAY_TTL_MS = 30 * 60 * 1000;

interface RelayEnvelope {
  savedAt: number;
  answers: DiagnosticAnswers;
}

let memory: RelayEnvelope | null = null;

/** Appelé au clic sur « Calculer mon vrai taux » depuis le diagnostic. */
export function setDiagnosticRelay(answers: DiagnosticAnswers, now = Date.now()): void {
  if (answeredCount(answers) === 0) return;
  memory = { savedAt: now, answers: sanitizeAnswers(answers) };
  try {
    localStorage.setItem(RELAY_KEY, JSON.stringify(memory));
  } catch {
    /* stockage bloqué : la variable de module couvre la navigation interne */
  }
}

/** Lit puis efface le relais. Renvoie null s'il n'y en a pas (ou s'il a expiré). */
export function consumeDiagnosticRelay(now = Date.now()): DiagnosticAnswers | null {
  let env: RelayEnvelope | null = memory;
  memory = null;
  try {
    if (!env) {
      const raw = localStorage.getItem(RELAY_KEY);
      env = raw ? (JSON.parse(raw) as RelayEnvelope) : null;
    }
    localStorage.removeItem(RELAY_KEY);
  } catch {
    /* illisible ou indisponible : on garde ce que la mémoire avait */
  }
  if (!env || typeof env.savedAt !== "number" || now - env.savedAt > RELAY_TTL_MS) return null;
  const answers = sanitizeAnswers(env.answers);
  return answeredCount(answers) > 0 ? answers : null;
}

