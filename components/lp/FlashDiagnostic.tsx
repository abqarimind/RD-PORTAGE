"use client";

/**
 * Interactive flash diagnostic — hero micro-engagement. Three taps, NO email,
 * an instant range (count-up), then a single benefit CTA into the full
 * simulator. Uses the SAME fiscal engine and buckets as the full simulator,
 * so the flash fourchette is consistent with /simulateur.
 *
 * Events: diag_started / diag_q{1,2,3}_answered / diag_completed (internal)
 * and DiagnosticStart / DiagnosticComplete (Meta).
 */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { HouseholdInput } from "@/lib/fiscal/ir";
import { simulate, type CurrentStatus } from "@/lib/fiscal/scenarios";
import { trackEvent } from "@/lib/tracking/events";
import { metaDiagnosticComplete, metaDiagnosticStart } from "@/lib/tracking/meta";
import { CountUp } from "./CountUp";

const BRASS = "#B08D57";
// Client préfère un seul niveau typographique (pas de serif).
const SERIF = "'Manrope','IBM Plex Sans',sans-serif";

type Q1 = { label: string; status: CurrentStatus };
type Q2 = { label: string; tjm: number; monthlyGross: number };
type Q3 = { label: string; household: HouseholdInput };

const Q1_OPTIONS: Q1[] = [
  { label: "Salarié ESN", status: "salarie_esn" },
  { label: "Freelance (micro ou SASU)", status: "freelance_micro" },
  { label: "Porté ailleurs", status: "porte_ailleurs" },
  { label: "En transition", status: "transition" },
];

const Q2_OPTIONS: Q2[] = [
  { label: "Moins de 350 € / 3 500 €", tjm: 300, monthlyGross: 3_000 },
  { label: "350 à 500 € / 3 500 à 5 000 €", tjm: 425, monthlyGross: 4_250 },
  { label: "500 à 650 € / 5 000 à 6 500 €", tjm: 575, monthlyGross: 5_750 },
  { label: "Plus de 650 € / 6 500 €", tjm: 700, monthlyGross: 7_000 },
];

const Q3_OPTIONS: Q3[] = [
  { label: "Célibataire", household: { maritalStatus: "celibataire", children: 0, childrenGardeAlternee: 0 } },
  { label: "Marié·Pacsé", household: { maritalStatus: "marie_pacse", children: 0, childrenGardeAlternee: 0 } },
  { label: "Enfants à charge", household: { maritalStatus: "marie_pacse", children: 2, childrenGardeAlternee: 0 } },
  { label: "Garde alternée", household: { maritalStatus: "celibataire", children: 0, childrenGardeAlternee: 1 } },
];

export function FlashDiagnostic({ angle, simulateurHref = "/simulateur" }: { angle: string; simulateurHref?: string }) {
  const [q1, setQ1] = useState<Q1 | null>(null);
  const [q2, setQ2] = useState<Q2 | null>(null);
  const [q3, setQ3] = useState<Q3 | null>(null);

  const range = useMemo(() => {
    if (!q1 || !q2 || !q3) return null;
    return simulate({
      status: q1.status,
      tjmOrMonthlyGross: q1.status === "salarie_esn" ? q2.monthlyGross : q2.tjm,
      daysPerYear: 210,
      household: q3.household,
      // Typical optimisation levers for the flash estimate only.
      fraisReelsAnnual: 4_800,
      versementsPER: 4_000,
    }).economieRange;
  }, [q1, q2, q3]);

  const answer =
    <T,>(set: (v: T) => void, event: "diag_q1_answered" | "diag_q2_answered" | "diag_q3_answered") =>
    (v: T) => {
      if (event === "diag_q1_answered" && !q1) {
        trackEvent("diag_started");
        metaDiagnosticStart(angle);
      }
      set(v);
      trackEvent(event);
      if (event === "diag_q3_answered") {
        trackEvent("diag_completed");
      }
    };

  const step = !q1 ? 1 : !q2 ? 2 : !q3 ? 3 : 4;

  return (
    <div id="diagnostic" className="mx-auto w-full max-w-md rounded-3xl bg-white p-5 text-left shadow-xl ring-1 ring-[#ECEEF3] md:p-6">
      {step <= 3 ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BRASS }}>
              Diagnostic flash
            </p>
            <p className="text-xs font-bold tabular-nums text-[#7A8093]">{step} / 3</p>
          </div>
          {/* progress — width only animates on the bar, transform-friendly */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#F0F1F5]">
            <div
              className="h-1.5 rounded-full transition-[width] duration-300"
              style={{ width: `${(step / 3) * 100}%`, backgroundColor: BRASS }}
            />
          </div>
          {step === 1 && <Choices title="Votre statut aujourd'hui ?" options={Q1_OPTIONS} onPick={answer(setQ1, "diag_q1_answered")} />}
          {step === 2 && (
            <Choices title="Votre TJM (ou salaire brut mensuel) ?" options={Q2_OPTIONS} onPick={answer(setQ2, "diag_q2_answered")} />
          )}
          {step === 3 && <Choices title="Votre foyer ?" options={Q3_OPTIONS} onPick={answer(setQ3, "diag_q3_answered")} />}
          <p className="mt-4 text-[11px] leading-relaxed text-[#9aa0b0]">
            Sans email, sans engagement. Réponse immédiate à la 3ᵉ question.
          </p>
        </>
      ) : (
        range && <FlashResult low={range.low} high={range.high} simulateurHref={simulateurHref} angle={angle} />
      )}
    </div>
  );
}

function FlashResult({
  low,
  high,
  simulateurHref,
  angle,
}: {
  low: number;
  high: number;
  simulateurHref: string;
  angle: string;
}) {
  // Fire DiagnosticComplete once when the result mounts.
  useEffect(() => {
    metaDiagnosticComplete({ low, high, angle });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-[#7A8093]">Estimation immédiate</p>
      <p className="mt-2 text-sm text-[#4A5061]">Vous laissez probablement chaque année, sur la table :</p>
      <p className="mt-1 leading-none" style={{ fontFamily: SERIF }}>
        <CountUp value={low} className="text-3xl font-bold tabular-nums md:text-4xl" />
        <span className="mx-1 text-2xl font-bold text-[#7A8093]">–</span>
        <CountUp value={high} className="text-4xl font-extrabold tabular-nums md:text-5xl" />
        <span className="ml-1 text-2xl font-bold" style={{ color: BRASS }}>
          €
        </span>
      </p>
      <p className="mt-3 text-xs leading-relaxed text-[#7A8093]">
        Fourchette indicative. Le calcul précis — foyer complet, frais réels, PER, dispositifs légaux — prend 2 à 3 minutes.
      </p>
      <Link
        href={simulateurHref}
        onClick={() => trackEvent("sim_started", { from: "flash", angle })}
        className="mt-4 block rounded-full bg-[#0B0D12] px-6 py-3 text-center text-sm font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      >
        Calculer mon vrai taux — 2 à 3 min
      </Link>
    </div>
  );
}

function Choices<T extends { label: string }>({
  title,
  options,
  onPick,
}: {
  title: string;
  options: T[];
  onPick: (option: T) => void;
}) {
  return (
    <fieldset className="mt-4">
      <legend className="text-lg font-extrabold tracking-tight" style={{ fontFamily: SERIF }}>
        {title}
      </legend>
      <div className="mt-3 grid grid-cols-1 gap-2">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onPick(option)}
            className="rounded-xl border border-[#E2E5EE] bg-white px-4 py-3 text-left text-sm font-semibold text-[#0B0D12] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#B08D57] hover:shadow-sm"
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
