"use client";

/**
 * Provider du simulateur — le store unique (spec §4.1).
 *
 * Responsabilités, et rien d'autre :
 *  - exposer l'état et les actions à tout l'arbre de composants ;
 *  - tenir l'étape courante DANS L'URL (`?step=foyer`), pour que le bouton
 *    retour natif et le geste de retour mobile fassent la même chose que le
 *    bouton « Retour » de l'interface ;
 *  - sauvegarder à chaque changement et restaurer au chargement.
 *
 * Aucun calcul ici : les dérivés vivent dans useSimulation().
 */
import { useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { clearState, loadState, newSimulationId, saveState } from "./persistence";
import {
  createInitialState,
  isStep,
  reducer,
  type FormState,
  type SimulatorAction,
  type SimulatorState,
  type Step,
} from "./state";

interface SimulatorContextValue {
  state: SimulatorState;
  dispatch: React.Dispatch<SimulatorAction>;
  /** Navigue vers une étape ET met l'URL à jour (entrée d'historique). */
  goTo: (step: Step) => void;
  /** Raccourci typé pour un champ de formulaire. */
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  /** « Nouvelle simulation » : purge totale + retour étape 1 (BUG-03). */
  reset: () => void;
  /** Vrai tant que la restauration localStorage n'a pas eu lieu. */
  hydrating: boolean;
}

const SimulatorContext = createContext<SimulatorContextValue | null>(null);

export function SimulatorProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlStep = searchParams.get("step");

  // L'identifiant initial est généré paresseusement : un identifiant tiré au
  // rendu serveur puis re-tiré au client provoquerait une erreur d'hydratation.
  const [state, dispatch] = useReducer(reducer, null, () => createInitialState("pending"));
  const [hydrating, setHydrating] = useState(true);
  const restored = useRef(false);

  /* ————— restauration au montage (une seule fois) ————— */
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    const saved = loadState();
    const base = saved ?? createInitialState(newSimulationId());
    // L'URL fait autorité sur l'étape : un lien partagé ou un retour natif
    // doit gagner sur l'étape enregistrée.
    const step: Step = isStep(urlStep) ? urlStep : base.step;
    dispatch({ type: "restore", state: { ...base, step, visited: base.visited.includes(step) ? base.visited : [...base.visited, step] } });
    setHydrating(false);
    // Dépendances volontairement vides : ne rejouer la restauration
    // qu'au montage, jamais sur un changement d'URL ultérieur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ————— autosave (après hydratation seulement) ————— */
  useEffect(() => {
    if (hydrating) return;
    saveState(state);
  }, [state, hydrating]);

  /* ————— l'URL pilote l'étape : retour natif du navigateur ————— */
  useEffect(() => {
    if (hydrating) return;
    if (isStep(urlStep) && urlStep !== state.step) {
      dispatch({ type: "go_to", step: urlStep });
    }
    // Une URL sans `step` (arrivée directe sur /simulateur) ne force rien :
    // l'état restauré reste maître, et goTo réalignera l'URL au prochain pas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlStep, hydrating]);

  const goTo = useCallback(
    (step: Step) => {
      dispatch({ type: "go_to", step });
      // push (et non replace) : chaque étape est une entrée d'historique, donc
      // le retour natif revient à l'étape précédente au lieu de quitter le site.
      router.push(`/simulateur?step=${step}`, { scroll: false });
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    },
    [router],
  );

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) =>
      dispatch({ type: "set_field", key, value: value as FormState[keyof FormState] }),
    [],
  );

  const reset = useCallback(() => {
    clearState();
    dispatch({ type: "reset", simulationId: newSimulationId(), now: new Date().toISOString() });
    router.push("/simulateur?step=profil", { scroll: false });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [router]);

  const value = useMemo<SimulatorContextValue>(
    () => ({ state, dispatch, goTo, setField, reset, hydrating }),
    [state, goTo, setField, reset, hydrating],
  );

  return <SimulatorContext.Provider value={value}>{children}</SimulatorContext.Provider>;
}

export function useSimulator(): SimulatorContextValue {
  const ctx = useContext(SimulatorContext);
  if (!ctx) throw new Error("useSimulator doit être utilisé à l'intérieur de <SimulatorProvider>");
  return ctx;
}
