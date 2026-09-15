"use client";

/**
 * Diagnostic flash — trois questions qui segmentent, préremplissent et
 * réveillent (§3.1).
 *
 * Ce n'est plus une version dégradée du simulateur : les réponses sont
 * transmises au simulateur, qui ne redemande rien. Le lien de sortie porte
 * les réponses en clair (lib/diagnostic/answers.ts), et l'état est partagé
 * entre les deux instances montées sur une même landing.
 *
 * La 3e question n'alimente aucun calcul. Elle installe le manque que le
 * simulateur vient combler — « personne ne t'avait jamais calculé ton vrai
 * taux de foyer » — et c'est elle qui porte le Aha.
 *
 * SORTIE CHIFFRÉE — changement assumé, documenté dans le rapport : le
 * diagnostic annonçait jusqu'ici une fourchette de « laissé sur la table ».
 * Depuis la suppression de l'écrêtage (BUG-02), cette valeur peut être
 * NÉGATIVE pour un micro-entrepreneur : l'afficher en accroche de landing
 * était intenable. La sortie est donc une fourchette de NET PERÇU, positive
 * pour tous les segments, calculée sur les bornes de la fourchette choisie et
 * volontairement CONSERVATRICE (sans avantages, sans frais professionnels) :
 * le simulateur ne peut que faire mieux, jamais contredire.
 */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  answeredCount,
  answersBracket,
  DEJA_CALCULE_OPTIONS,
  DIAGNOSTIC_SEGMENTS,
  isComplete,
  simulateurHref,
  type DejaCalcule,
} from "@/lib/diagnostic/answers";
import { useDiagnostic } from "@/lib/diagnostic/store";
import { computePortage } from "@/lib/fiscal/portage";
import { trackEvent } from "@/lib/tracking/events";
import { metaDiagnosticComplete, metaDiagnosticStart } from "@/lib/tracking/meta";
import { CountUp } from "./CountUp";

const BRASS = "#B08D57";
const VALIDE = "#2F6B4F";
const SANS = "'Manrope','IBM Plex Sans',sans-serif";

/** Hypothèses conservatrices de l'estimation flash — sans avantages. */
const FLASH_DAYS = 20;

export function FlashDiagnostic({ angle, simulateurHref: base = "/simulateur" }: { angle: string; simulateurHref?: string }) {
  const { answers, setAnswer, hydrating } = useDiagnostic();

  const netRange = useMemo(() => {
    if (!answers.tjmBracketId) return null;
    const b = answersBracket(answers);
    const net = (tjm: number) => computePortage({ tjm, days: FLASH_DAYS, mealVouchers: false }).netPerceived;
    return { low: net(b.min), high: net(b.max) };
  }, [answers]);

  const step = !answers.segment ? 1 : !answers.tjmBracketId ? 2 : !answers.dejaCalcule ? 3 : 4;

  function answer<K extends "segment" | "tjmBracketId" | "dejaCalcule">(
    key: K,
    value: string,
    event: "diag_q1_answered" | "diag_q2_answered" | "diag_q3_answered",
  ) {
    if (event === "diag_q1_answered" && answeredCount(answers) === 0) {
      trackEvent("diag_started");
      metaDiagnosticStart(angle);
    }
    setAnswer(key, value as never);
    trackEvent(event);
    if (event === "diag_q3_answered") trackEvent("diag_completed");
  }

  if (hydrating) {
    // Le squelette reprend EXACTEMENT la structure de la première question :
    // en-tête, barre de progression, titre, quatre options, mention. Un
    // squelette plus court que le contenu qu'il annonce fait grandir la page
    // à l'hydratation, et ce décalage se paie sur le CTA au moment du clic.
    return (
      <div
        className="mx-auto w-full max-w-md rounded-3xl bg-white p-5 text-left shadow-xl ring-1 ring-[#ECEEF3] md:p-6"
        style={{ fontFamily: SANS }}
        aria-hidden
      >
        <div className="flex items-center justify-between">
          <div className="h-4 w-28 animate-pulse rounded bg-[#F0F1F5]" />
          <div className="h-4 w-8 animate-pulse rounded bg-[#F0F1F5]" />
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-[#F0F1F5]" />
        <div className="mt-4">
          <div className="h-7 w-3/4 animate-pulse rounded bg-[#F0F1F5]" />
          <div className="mt-3 grid grid-cols-1 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-[#F5F6F9]" />
            ))}
          </div>
        </div>
        <div className="mt-4 space-y-1">
          <div className="h-3 w-full animate-pulse rounded bg-[#F5F6F9]" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-[#F5F6F9]" />
        </div>
      </div>
    );
  }

  return (
    <div
      id="diagnostic"
      className="mx-auto w-full max-w-md rounded-3xl bg-white p-5 text-left shadow-xl ring-1 ring-[#ECEEF3] md:p-6"
      style={{ fontFamily: SANS, color: "#0B0D12" }}
    >
      {step <= 3 ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BRASS }}>
              Diagnostic flash
            </p>
            <p className="text-xs font-bold tabular-nums text-[#7A8093]">{step} / 3</p>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#F0F1F5]">
            {/* transform plutôt que width : pas de recalcul de mise en page. */}
            <div
              className="h-1.5 w-full origin-left rounded-full transition-transform duration-300"
              style={{ transform: `scaleX(${step / 3})`, backgroundColor: BRASS }}
            />
          </div>

          {step === 1 && (
            <Choices
              title="Aujourd'hui, vous êtes…"
              options={DIAGNOSTIC_SEGMENTS.map((s) => ({ id: s.id, label: s.label }))}
              onPick={(id) => answer("segment", id, "diag_q1_answered")}
            />
          )}
          {step === 2 && (
            <Choices
              title="Votre TJM, approximativement"
              options={TJM_CHOICES}
              onPick={(id) => answer("tjmBracketId", id, "diag_q2_answered")}
            />
          )}
          {step === 3 && (
            <Choices
              title="Avez-vous déjà fait calculer votre taux d'imposition réel de foyer ?"
              options={DEJA_CALCULE_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
              onPick={(id) => answer("dejaCalcule", id as DejaCalcule, "diag_q3_answered")}
            />
          )}

          <p className="mt-4 text-[11px] leading-relaxed text-[#9aa0b0]">
            Sans email, sans engagement. Réponse immédiate à la 3ᵉ question.
          </p>
        </>
      ) : (
        netRange && <FlashResult low={netRange.low} high={netRange.high} answers={answers} base={base} angle={angle} />
      )}
    </div>
  );
}

const TJM_CHOICES = [
  { id: "lt350", label: "Moins de 350 €" },
  { id: "350-500", label: "350 à 500 €" },
  { id: "500-650", label: "500 à 650 €" },
  { id: "gt650", label: "Plus de 650 €" },
];

function FlashResult({
  low,
  high,
  answers,
  base,
  angle,
}: {
  low: number;
  high: number;
  answers: ReturnType<typeof useDiagnostic>["answers"];
  base: string;
  angle: string;
}) {
  useEffect(() => {
    metaDiagnosticComplete({ low, high, angle });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { setAnswer } = useDiagnostic();

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-[#7A8093]">Estimation immédiate</p>
      <p className="mt-2 text-sm text-[#4A5061]">En portage RD, vous percevriez chaque mois, net :</p>
      <p className="mt-1 leading-none">
        <CountUp value={low} className="text-3xl font-bold tabular-nums md:text-4xl" />
        <span className="mx-1 text-2xl font-bold text-[#7A8093]">–</span>
        <CountUp value={high} className="text-4xl font-extrabold tabular-nums md:text-5xl" />
        <span className="ml-1 text-2xl font-bold" style={{ color: BRASS }}>
          €
        </span>
      </p>
      <p className="mt-2 text-xs leading-relaxed text-[#7A8093]">
        Estimation prudente, sur 20 jours facturés et sans vos avantages — le calcul complet ne peut que faire mieux.
      </p>

      {/* La 3e réponse porte le Aha : c'est elle qui installe la suite. */}
      <p className="mt-4 rounded-2xl p-4 text-sm leading-relaxed" style={{ backgroundColor: "#E7F6EE", color: "#0B0D12" }}>
        {answers.dejaCalcule === "oui" ? (
          <>
            Vous l&rsquo;avez déjà fait calculer. Vérifions-le : <strong>votre vrai taux d&rsquo;imposition de foyer</strong> —
            situation familiale, frais réels, PER — s&rsquo;obtient à l&rsquo;étape suivante.
          </>
        ) : (
          <>
            Ce chiffre ne dit rien de votre impôt. <strong>Votre vrai taux d&rsquo;imposition de foyer</strong> — celui que
            personne ne vous a jamais calculé — s&rsquo;obtient à l&rsquo;étape suivante.
          </>
        )}
      </p>

      <Link
        href={simulateurHref(answers, base)}
        onClick={() => trackEvent("sim_started", { from: "flash", angle })}
        className="mt-4 flex min-h-[48px] items-center justify-center rounded-full bg-[#0B0D12] px-6 py-3 text-center text-base font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      >
        Calculer mon vrai taux — 2 min
      </Link>
      <p className="mt-2 text-center text-xs text-[#9aa0b0]">Vos réponses sont conservées — vous reprenez à l&rsquo;étape 2.</p>
      <div className="mt-1 flex justify-center">
        <button
          type="button"
          // Cible tactile pleine hauteur : le libellé est petit, la zone
          // cliquable ne doit pas l'être.
          className="inline-flex min-h-[44px] items-center px-4 text-xs text-[#9aa0b0] underline underline-offset-2"
          onClick={() => setAnswer("segment", null)}
        >
          Recommencer le diagnostic
        </button>
      </div>
    </div>
  );
}

function Choices({
  title,
  options,
  onPick,
}: {
  title: string;
  options: { id: string; label: string }[];
  onPick: (id: string) => void;
}) {
  return (
    <fieldset className="mt-4">
      <legend className="text-lg font-extrabold tracking-tight">{title}</legend>
      <div className="mt-3 grid grid-cols-1 gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onPick(o.id)}
            className="min-h-[48px] rounded-xl border border-[#E2E5EE] bg-white px-4 py-3 text-left text-base font-semibold text-[#0B0D12] transition-[background-color,border-color,color,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-[#B08D57] hover:shadow-sm"
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export { isComplete };
