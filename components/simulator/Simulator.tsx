"use client";

/**
 * Simulateur RD Portage — orchestrateur.
 *
 * Ce composant faisait 820 lignes et portait à lui seul l'état, la
 * navigation, les calculs et tout le rendu : c'est cette concentration qui
 * rendait BUG-01, BUG-02 et BUG-03 inévitables. Il ne fait plus que trois
 * choses : câbler le store, afficher la bonne étape, et suivre le tunnel.
 *
 * L'état vit dans lib/simulateur/ (store + reducer + persistance), les
 * dérivés dans useSimulation(), chaque écran dans steps/.
 */
import { Suspense, useEffect } from "react";
import { PROGRESS_STEPS, STEP_LABELS, stepIndex, type Step } from "@/lib/simulateur/state";
import { SimulatorProvider, useSimulator } from "@/lib/simulateur/store";
import { trackEvent } from "@/lib/tracking/events";
import { ensureMetaInit, metaContact, metaSchedule, metaSimulateurStart } from "@/lib/tracking/meta";
import { ActiviteStep } from "./steps/ActiviteStep";
import { FoyerStep } from "./steps/FoyerStep";
import { ProfilStep } from "./steps/ProfilStep";
import { InscriptionStep } from "./steps/InscriptionStep";
import { ResultatsStep } from "./steps/ResultatsStep";
import { BRASS, GHOST_BTN, SANS, SimulatorStyles, INK } from "./ui";

const RDV_URL = process.env.NEXT_PUBLIC_RDV_URL ?? "tel:+33632988723";

export function Simulator() {
  return (
    // useSearchParams impose une frontière Suspense en App Router.
    <Suspense fallback={<SimulatorSkeleton />}>
      <SimulatorProvider>
        <SimulatorShell />
      </SimulatorProvider>
    </Suspense>
  );
}

function SimulatorShell() {
  const { state, goTo, reset, hydrating } = useSimulator();

  useEffect(() => {
    ensureMetaInit();
    metaSimulateurStart();
  }, []);

  function onRdv(from: string) {
    trackEvent("rdv_clicked", { from });
    if (RDV_URL.startsWith("tel:")) metaContact({ from });
    else metaSchedule({ from });
  }

  if (hydrating) return <SimulatorSkeleton />;

  const previous = previousStep(state.step);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8" style={{ fontFamily: SANS, color: INK }}>
      <ProgressBar current={state.step} />

      {/* Retour d'interface — strictement équivalent au retour natif du
          navigateur, puisque les deux reposent sur l'historique d'URL. */}
      {previous && (
        <button type="button" onClick={() => goTo(previous)} className={`${GHOST_BTN} -ml-4 mb-2 no-underline`}>
          ← {STEP_LABELS[previous]}
        </button>
      )}

      <div key={state.step} className="step-enter">
        {state.step === "profil" && <ProfilStep />}
        {state.step === "activite" && <ActiviteStep />}
        {state.step === "foyer" && <FoyerStep />}
        {state.step === "resultats" && <ResultatsStep onRdv={onRdv} />}
        {state.step === "inscription" && <InscriptionStep onRdv={onRdv} />}
      </div>

      <div className="mt-10 border-t border-[#ECEEF3] pt-5 text-center">
        {state.step !== "profil" && (
          <button type="button" className={GHOST_BTN} onClick={reset}>
            Recommencer une simulation
          </button>
        )}
        <p className="mt-3 text-xs text-[#9aa0b0]">
          Simulation à valeur indicative — ne constitue pas un conseil fiscal personnalisé. Barème IR 2026 (revenus 2025),
          cagnottes affichées nettes de frais de service.
        </p>
      </div>

      <SimulatorStyles />
    </div>
  );
}

function previousStep(step: Step): Step | null {
  const order: Step[] = ["profil", "activite", "foyer", "resultats", "inscription"];
  const i = order.indexOf(step);
  return i > 0 ? order[i - 1] : null;
}

function ProgressBar({ current }: { current: Step }) {
  // L'inscription n'est pas une étape de simulation : la barre reste pleine.
  const shown = Math.min(stepIndex(current), PROGRESS_STEPS.length - 1);
  return (
    <div className="mb-6">
      <div className="flex justify-between text-xs text-[#7A8093]">
        {PROGRESS_STEPS.map((s, i) => (
          <span key={s} className={i <= shown ? "font-bold text-[#0B0D12]" : ""}>
            {STEP_LABELS[s]}
          </span>
        ))}
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#F0F1F5]">
        <div
          className="h-1.5 rounded-full transition-[width] duration-300"
          style={{ width: `${((shown + 1) / PROGRESS_STEPS.length) * 100}%`, backgroundColor: BRASS }}
        />
      </div>
    </div>
  );
}

function SimulatorSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8" style={{ fontFamily: SANS }}>
      <div className="h-1.5 w-full animate-pulse rounded-full bg-[#F0F1F5]" />
      <div className="mt-8 h-8 w-2/3 animate-pulse rounded bg-[#F0F1F5]" />
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-[#F5F6F9]" />
        ))}
      </div>
    </div>
  );
}
