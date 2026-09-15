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
import { carriesRelay, decodeAnswers, isComplete } from "@/lib/diagnostic/answers";
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
    let base = saved ?? createInitialState(newSimulationId());

    /**
     * RELAIS DU DIAGNOSTIC FLASH (§3.2).
     *
     * Le lien de sortie du diagnostic porte les réponses en clair
     * (`?from=diag&p=…&t=…&q3=…`). Elles font autorité : l'utilisateur vient
     * de cliquer, son intention est explicite. Toute valeur inconnue est
     * ignorée par decodeAnswers, donc un relais tronqué ou bricolé donne un
     * parcours vierge plutôt qu'un écran cassé.
     */
    let step: Step | null = isStep(urlStep) ? urlStep : null;
    if (carriesRelay(searchParams)) {
      const answers = decodeAnswers(searchParams);
      base = reducer(base, { type: "apply_diagnostic", answers });
      // L'étape Profil est servie par le diagnostic : on ouvre directement sur
      // Activité, ce qui EST l'avancement réel — c'est une étape entière
      // économisée, pas un affichage flatteur. Le bouton « Retour » y reste
      // disponible pour corriger le profil.
      if (!step) step = answers.segment ? "activite" : "profil";
      if (answers.segment) base = { ...base, visited: ["profil", "activite"] };
    }

    const resolved: Step = step ?? base.step;
    dispatch({
      type: "restore",
      state: {
        ...base,
        step: resolved,
        visited: base.visited.includes(resolved) ? base.visited : [...base.visited, resolved],
      },
    });
    setHydrating(false);
    // Dépendances volontairement vides : ne rejouer la restauration
    // qu'au montage, jamais sur un changement d'URL ultérieur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Normalise l'URL de relais en URL d'étape, avec `replace` et non `push` :
   * le retour natif doit ramener à la landing et à son diagnostic prérempli
   * (§3.4), pas à l'URL de relais qui rejouerait le préremplissage.
   */
  useEffect(() => {
    if (hydrating) return;
    if (carriesRelay(searchParams)) {
      router.replace(`/simulateur?step=${state.step}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrating]);

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
