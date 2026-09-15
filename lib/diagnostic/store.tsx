"use client";

/**
 * État partagé du diagnostic flash.
 *
 * Nécessaire parce que le diagnostic est monté DEUX FOIS sur chaque landing
 * (hero, puis section de rappel en bas de page). Avec un useState par
 * instance, répondre en haut laissait le bas vierge et inversement — et le
 * lien de sortie du bas ne portait alors aucune réponse.
 *
 * Persisté pour que le relais survive à un rafraîchissement et pour que le
 * retour arrière depuis la première étape du simulateur retrouve le
 * diagnostic prérempli (§3.4).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { EMPTY_ANSWERS, sanitizeAnswers, type DiagnosticAnswers } from "./answers";

const STORAGE_KEY = "rdp_diag_v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface Envelope {
  savedAt: string;
  answers: DiagnosticAnswers;
}

export function loadAnswers(now = Date.now()): DiagnosticAnswers {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_ANSWERS };
    const parsed = JSON.parse(raw) as Partial<Envelope>;
    if (!parsed?.savedAt || now - new Date(parsed.savedAt).getTime() > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return { ...EMPTY_ANSWERS };
    }
    return sanitizeAnswers(parsed.answers);
  } catch {
    // Stockage indisponible ou contenu illisible : parcours vierge, jamais
    // d'exception qui remonterait jusqu'à l'écran.
    return { ...EMPTY_ANSWERS };
  }
}

export function saveAnswers(answers: DiagnosticAnswers): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), answers } satisfies Envelope));
  } catch {
    /* le diagnostic continue de fonctionner sans persistance */
  }
}

export function clearAnswers(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

interface DiagnosticContextValue {
  answers: DiagnosticAnswers;
  setAnswer: <K extends keyof DiagnosticAnswers>(key: K, value: DiagnosticAnswers[K]) => void;
  reset: () => void;
  /** Vrai tant que la restauration n'a pas eu lieu — évite un flash de contenu. */
  hydrating: boolean;
}

const DiagnosticContext = createContext<DiagnosticContextValue | null>(null);

export function DiagnosticProvider({ children }: { children: React.ReactNode }) {
  const [answers, setAnswers] = useState<DiagnosticAnswers>(EMPTY_ANSWERS);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    setAnswers(loadAnswers());
    setHydrating(false);
  }, []);

  const setAnswer = useCallback<DiagnosticContextValue["setAnswer"]>((key, value) => {
    setAnswers((prev) => {
      const next = { ...prev, [key]: value };
      saveAnswers(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    clearAnswers();
    setAnswers({ ...EMPTY_ANSWERS });
  }, []);

  const value = useMemo(() => ({ answers, setAnswer, reset, hydrating }), [answers, setAnswer, reset, hydrating]);
  return <DiagnosticContext.Provider value={value}>{children}</DiagnosticContext.Provider>;
}

/**
 * Utilisable hors provider : une landing qui n'aurait pas été enveloppée
 * retombe sur un état local plutôt que de lever. Le diagnostic reste
 * fonctionnel, simplement non partagé entre ses instances.
 */
export function useDiagnostic(): DiagnosticContextValue {
  const ctx = useContext(DiagnosticContext);
  const [local, setLocal] = useState<DiagnosticAnswers>(EMPTY_ANSWERS);
  const setLocalAnswer = useCallback<DiagnosticContextValue["setAnswer"]>((key, value) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }, []);
  const fallback = useMemo(
    () => ({ answers: local, setAnswer: setLocalAnswer, reset: () => setLocal({ ...EMPTY_ANSWERS }), hydrating: false }),
    [local, setLocalAnswer],
  );
  return ctx ?? fallback;
}
