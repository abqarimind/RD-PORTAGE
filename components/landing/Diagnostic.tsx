"use client";

/**
 * Diagnostic flash — trois questions, une par écran, puis la valeur.
 *
 * Refonte du 14/10 (docs/cro/references-mobbin.md) :
 *  - la question 1 est rendue CÔTÉ SERVEUR : elle s'affiche avant le
 *    JavaScript, au lieu d'un squelette qui attendait l'hydratation ;
 *  - une question par écran, grandes zones de tap, progression « 1 sur 3 »,
 *    retour arrière qui garde les réponses (elles restent surlignées) ;
 *  - la 3e question porte sur le foyer et prépare le simulateur ;
 *  - la fourchette de net s'affiche SANS coordonnées ; ensuite deux suites :
 *    le calcul complet (simulateur) ou le rappel de Ridha, tout de suite.
 *
 * Les réponses passent au simulateur par lib/diagnostic/relay.ts, jamais par
 * l'URL (le Pixel Meta la transmet). Mesure : diag_started à la 1re réponse,
 * diag_completed + DiagnosticFlashComplete à la réponse à la 3e — jamais à la
 * simple restauration d'une fourchette lors d'une visite suivante.
 */
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  answeredCount,
  answersBracket,
  DIAGNOSTIC_SEGMENTS,
  FOYER_OPTIONS,
  isComplete,
  type DiagnosticAnswers,
} from "@/lib/diagnostic/answers";
import { setDiagnosticRelay } from "@/lib/diagnostic/relay";
import { useDiagnostic } from "@/lib/diagnostic/store";
import { computePortage } from "@/lib/fiscal/portage";
import { TJM_BRACKETS } from "@/lib/simulateur/brackets";
import { newSimulationId } from "@/lib/simulateur/persistence";
import { createInitialState, reducer, resolvedTjm } from "@/lib/simulateur/state";
import { trackEvent } from "@/lib/tracking/events";
import { metaDiagnosticFlashComplete, metaDiagnosticFlashStart } from "@/lib/tracking/meta";
import { CountUp } from "@/components/lp/CountUp";
import { LeadForm, type LeadDraft } from "@/components/lead/LeadForm";
import { FRAIS_GESTION_LABEL, RCS } from "@/config/contact";

const INK = "#0B0D12";
const MUTED = "#4A5061";
const BRASS_TEXT = "#8A6B3F";
/** Hypothèses prudentes de l'estimation flash — sans avantages ni frais. */
const FLASH_DAYS = 20;

type View = 1 | 2 | 3 | "resultat" | "rappel";

const QUESTIONS = {
  1: { title: "Aujourd'hui, tu es…", key: "segment" as const, options: DIAGNOSTIC_SEGMENTS.map((s) => ({ id: s.id, label: s.label })) },
  2: { title: "Ton TJM, à peu près", key: "tjmBracketId" as const, options: TJM_BRACKETS.map((b) => ({ id: b.id, label: b.label })) },
  3: { title: "Et ton foyer ?", key: "foyer" as const, options: FOYER_OPTIONS.map((o) => ({ id: o.id, label: o.label })) },
};

/** Écran à afficher pour des réponses restaurées : la première question sans réponse, sinon la fourchette. */
const viewFor = (a: DiagnosticAnswers): View => (!a.segment ? 1 : !a.tjmBracketId ? 2 : !a.foyer ? 3 : "resultat");

/** Brouillon de lead pour un rappel demandé dès la fourchette (simulateur non rempli). */
function draftFromDiagnostic(answers: DiagnosticAnswers): LeadDraft | null {
  if (!isComplete(answers)) return null;
  const { form } = reducer(createInitialState("flash"), { type: "apply_diagnostic", answers });
  if (!form.status) return null;
  return {
    simulation_id: newSimulationId(),
    form,
    profile: {
      statut_actuel: form.status,
      tjm_ou_ca: resolvedTjm(form),
      jours_factures: form.days,
      foyer: { situation: form.situation, enfants: form.enfants, garde_alternee: form.gardeAlternee },
    },
    simulation: { inputs: {}, scenarios: [], economie_annuelle_eur: 0, completed: false },
  };
}

export function Diagnostic() {
  const { answers, setAnswer, hydrating } = useDiagnostic();
  const [view, setView] = useState<View>(1);
  /** Rappel envoyé depuis la fourchette : plus de retour en arrière, donc pas de seconde demande. */
  const [rappelEnvoye, setRappelEnvoye] = useState(false);
  const restored = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Une fois les réponses restaurées depuis l'appareil : reprendre où la personne s'était arrêtée.
  useEffect(() => {
    if (hydrating || restored.current) return;
    restored.current = true;
    setView(viewFor(answers));
  }, [hydrating, answers]);

  const netRange = useMemo(() => {
    if (!answers.tjmBracketId) return null;
    const b = answersBracket(answers);
    const net = (tjm: number) => computePortage({ tjm, days: FLASH_DAYS, mealVouchers: false }).netPerceived;
    return { low: net(b.min), high: net(b.max) };
  }, [answers]);

  function go(next: View) {
    setView(next);
    // Le haut de la carte reste visible après chaque réponse (petits écrans).
    requestAnimationFrame(() => {
      const top = cardRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 0) cardRef.current?.scrollIntoView({ block: "start" });
    });
  }

  function pick(n: 1 | 2 | 3, id: string) {
    if (n === 1 && answeredCount(answers) === 0) {
      trackEvent("diag_started");
      metaDiagnosticFlashStart();
    }
    const key = QUESTIONS[n].key;
    setAnswer(key, id as never);
    trackEvent(n === 1 ? "diag_q1_answered" : n === 2 ? "diag_q2_answered" : "diag_q3_answered");
    if (n < 3) {
      go((n + 1) as View);
      return;
    }
    trackEvent("diag_completed");
    // Au moment de la réponse, et seulement là (voir l'en-tête).
    metaDiagnosticFlashComplete();
    go("resultat");
  }

  return (
    <div ref={cardRef} id="diagnostic" className="scroll-mt-4" style={{ color: INK }}>
      {(view === 1 || view === 2 || view === 3) && (
        <Question
          n={view}
          selected={answers[QUESTIONS[view].key]}
          onPick={(id) => pick(view, id)}
          onBack={view > 1 ? () => go((view - 1) as View) : undefined}
        />
      )}

      {view === "resultat" && netRange && (
        <Resultat low={netRange.low} high={netRange.high} answers={answers} onBack={() => go(3)} onRappel={() => go("rappel")} />
      )}

      {view === "rappel" && (
        <div>
          {!rappelEnvoye && (
            <button type="button" onClick={() => go("resultat")} className="mb-3 inline-flex min-h-[44px] items-center text-sm font-bold underline underline-offset-4" style={{ color: MUTED }}>
              ← Revoir ma fourchette
            </button>
          )}
          <LeadForm context="fourchette" draft={() => draftFromDiagnostic(answers)} onSent={() => setRappelEnvoye(true)} />
        </div>
      )}
    </div>
  );
}

function Question({
  n,
  selected,
  onPick,
  onBack,
}: {
  n: 1 | 2 | 3;
  selected: string | null;
  onPick: (id: string) => void;
  onBack?: () => void;
}) {
  const q = QUESTIONS[n];
  return (
    <fieldset>
      <div className="flex min-h-[28px] items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BRASS_TEXT }}>
          Question {n} sur 3
        </p>
        {onBack && (
          <button type="button" onClick={onBack} className="-mr-2 inline-flex min-h-[44px] items-center px-2 text-sm font-bold underline underline-offset-4" style={{ color: MUTED }}>
            ← Retour
          </button>
        )}
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#ECEEF3]" aria-hidden>
        <div className="h-1.5 w-full origin-left rounded-full bg-[#0B0D12] transition-transform duration-300" style={{ transform: `scaleX(${n / 3})` }} />
      </div>
      <legend className="sr-only">{q.title}</legend>
      <p aria-hidden className="mt-3 text-[19px] font-extrabold leading-tight tracking-tight">
        {q.title}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2">
        {q.options.map((o) => {
          const active = selected === o.id;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={active}
              onClick={() => onPick(o.id)}
              className={`flex min-h-[50px] w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-base font-bold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D57] focus-visible:ring-offset-2 ${
                active ? "border-[#0B0D12] bg-[#0B0D12] text-white" : "border-[#D8DCE6] bg-white text-[#0B0D12] hover:border-[#0B0D12]"
              }`}
            >
              <span>{o.label}</span>
              <span aria-hidden className={active ? "text-white" : "text-[#8A90A0]"}>
                ›
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs font-semibold" style={{ color: MUTED }}>
        Sans e-mail · gratuit · fourchette immédiate
      </p>
    </fieldset>
  );
}

function Resultat({
  low,
  high,
  answers,
  onBack,
  onRappel,
}: {
  low: number;
  high: number;
  answers: DiagnosticAnswers;
  onBack: () => void;
  onRappel: () => void;
}) {
  return (
    <div>
      <button type="button" onClick={onBack} className="-ml-1 inline-flex min-h-[44px] items-center px-1 text-sm font-bold underline underline-offset-4" style={{ color: MUTED }}>
        ← Modifier mes réponses
      </button>
      <p className="mt-1 text-sm font-semibold" style={{ color: MUTED }}>
        Ton net estimé chaque mois, en portage RD
      </p>
      <p className="mt-1 leading-none">
        <CountUp value={low} animateOnMount className="text-[30px] font-extrabold tabular-nums" />
        <span className="mx-1 text-2xl font-bold" style={{ color: MUTED }}>
          –
        </span>
        <CountUp value={high} animateOnMount className="text-[34px] font-extrabold tabular-nums" />
        <span className="ml-1 text-2xl font-extrabold">€</span>
      </p>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: MUTED }}>
        Estimation prudente : 20 jours facturés, sans tes avantages ni tes frais. Le calcul complet ne peut que faire mieux.
      </p>

      <p className="mt-3 rounded-2xl px-4 py-3 text-sm leading-relaxed" style={{ backgroundColor: "#FFF6CC", color: INK }}>
        Ce chiffre ne dit rien de ton impôt. <strong>Ton vrai taux d&rsquo;imposition de foyer</strong> se calcule à l&rsquo;étape
        suivante, avec tes réponses déjà reprises.
      </p>

      <Link
        href="/simulateur"
        onClick={() => {
          setDiagnosticRelay(answers);
          trackEvent("sim_started", { from: "flash" });
        }}
        className="mt-4 flex min-h-[52px] items-center justify-center rounded-full bg-[#0B0D12] px-6 py-3 text-center text-base font-extrabold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D57] focus-visible:ring-offset-2"
      >
        Calculer mon vrai taux — 2 min
      </Link>
      <button
        type="button"
        onClick={onRappel}
        className="mt-2 flex min-h-[52px] w-full items-center justify-center rounded-full border-2 border-[#0B0D12] bg-white px-6 py-3 text-base font-extrabold text-[#0B0D12] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D57] focus-visible:ring-offset-2"
      >
        Être rappelé par Ridha
      </button>

      <div className="mt-4 flex items-center gap-3 border-t border-[#ECEEF3] pt-4">
        <Image src="/ridha.png" alt="Ridha Chammam" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full object-cover" />
        <p className="text-xs leading-snug" style={{ color: MUTED }}>
          <strong className="text-[#0B0D12]">« J&rsquo;ai moi-même été consultant porté. »</strong>
          <br />
          Ridha Chammam, fondateur · {FRAIS_GESTION_LABEL} de frais de gestion
        </p>
      </div>
      <p className="mt-3 text-[11px] leading-snug" style={{ color: MUTED }}>
        Estimation indicative · RD Portage, société de portage salarial · {RCS}
      </p>
    </div>
  );
}
