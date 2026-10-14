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
import { Suspense } from "react";
import { PROGRESS_STEPS, STEP_LABELS, type Step } from "@/lib/simulateur/state";
import { SimulatorProvider, useSimulator } from "@/lib/simulateur/store";
import { ActiviteStep } from "./steps/ActiviteStep";
import { FoyerStep } from "./steps/FoyerStep";
import { ProfilStep } from "./steps/ProfilStep";
import { ResultatsStep } from "./steps/ResultatsStep";
import { BRASS, GHOST_BTN, SANS, SimulatorStyles, INK } from "./ui";


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

  if (hydrating) return <SimulatorSkeleton />;

  // Seul·e sans enfant (diagnostic) : l'écran Foyer est sauté, aller comme retour.
  const sauterFoyer = state.foyerDiag === "seul";
  const previous = previousStep(state.step, sauterFoyer);

  return (
    <div className="mx-auto max-w-form px-4 py-8" style={{ fontFamily: SANS, color: INK }}>
      <ProgressBar current={state.step} sauterFoyer={sauterFoyer} />

      {/* Retour d'interface — strictement équivalent au retour natif du
          navigateur, puisque les deux reposent sur l'historique d'URL. */}
      {previous && (
        <button type="button" onClick={() => goTo(previous)} className={`${GHOST_BTN} -ml-4 mb-2 no-underline`}>
          ← {STEP_LABELS[previous]}
        </button>
      )}

      {/* §3.3 — l'effort conservé doit se VOIR, sinon le bénéfice est perdu. */}
      {(state.prefilled.status || state.prefilled.tjm) && state.step === "activite" && (
        <div className="mb-5 rounded-2xl px-4 py-3" style={{ backgroundColor: "#E7F6EE" }}>
          <p className="text-sm font-semibold">Tes réponses du diagnostic sont reprises.</p>
          <p className="mt-0.5 text-sm text-[#4A5061]">
            {state.prefilled.status && state.prefilled.tjm
              ? "Ton profil et ton TJM"
              : state.prefilled.status
                ? "Ton profil"
                : "Ton TJM"}{" "}
            : modifiable{state.prefilled.status && state.prefilled.tjm ? "s" : ""} à tout moment.
          </p>
        </div>
      )}

      <div key={state.step} className="step-enter">
        {state.step === "profil" && <ProfilStep />}
        {state.step === "activite" && <ActiviteStep />}
        {state.step === "foyer" && <FoyerStep />}
        {/* « inscription » : ancienne étape, le formulaire est désormais sur l'écran du résultat. */}
        {(state.step === "resultats" || state.step === "inscription") && <ResultatsStep />}
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

function previousStep(step: Step, sauterFoyer: boolean): Step | null {
  const order: Step[] = sauterFoyer ? ["profil", "activite", "resultats"] : ["profil", "activite", "foyer", "resultats"];
  const i = order.indexOf(step === "inscription" ? "resultats" : step);
  return i > 0 ? order[i - 1] : null;
}

function ProgressBar({ current, sauterFoyer }: { current: Step; sauterFoyer: boolean }) {
  const steps = sauterFoyer ? PROGRESS_STEPS.filter((s) => s !== "foyer") : PROGRESS_STEPS;
  const shown = Math.max(0, steps.indexOf(current === "inscription" ? "resultats" : current));
  return (
    <div className="mb-6">
      <div className="flex justify-between text-xs text-[#5E6475]">
        {steps.map((s, i) => (
          <span key={s} className={i <= shown ? "font-bold text-[#0B0D12]" : ""}>
            {STEP_LABELS[s]}
          </span>
        ))}
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#F0F1F5]">
        {/* Animé en transform et non en width : animer une largeur force un
            recalcul de mise en page à chaque image. */}
        <div
          className="h-1.5 w-full origin-left rounded-full transition-transform duration-300"
          style={{ transform: `scaleX(${(shown + 1) / steps.length})`, backgroundColor: BRASS }}
        />
      </div>
    </div>
  );
}

/**
 * Squelette calé sur l'étape Profil, la première affichée : mêmes repères
 * d'en-tête, même nombre d'options, mêmes hauteurs. Un squelette plus court
 * que le contenu ferait grandir la page à l'hydratation, et ce décalage se
 * produit précisément au moment où l'utilisateur va cliquer.
 */
function SimulatorSkeleton() {
  return (
    <div className="mx-auto max-w-form px-4 py-8" style={{ fontFamily: SANS }} aria-hidden>
      <div className="mb-6">
        <div className="flex justify-between">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-3 w-14 animate-pulse rounded bg-[#F0F1F5]" />
          ))}
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-[#F0F1F5]" />
      </div>
      <div className="h-8 w-1/2 animate-pulse rounded bg-[#F0F1F5]" />
      <div className="mt-1 h-4 w-3/4 animate-pulse rounded bg-[#F5F6F9]" />
      <div className="mt-6 space-y-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[74px] animate-pulse rounded-2xl bg-[#F5F6F9]" />
        ))}
      </div>
    </div>
  );
}
