"use client";

/**
 * HERO — ACTE INTÉRÊT. Locked promise + 3-question flash diagnostic.
 * One tap per question, instant range estimate at the 3rd answer, single CTA
 * to the full simulator. NO email capture here, by design.
 * Must fit a 390px viewport without scrolling.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { simulate, type CurrentStatus } from "@/lib/fiscal/scenarios";
import type { HouseholdInput } from "@/lib/fiscal/ir";
import { trackEvent } from "@/lib/tracking/events";

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

const eur = (n: number) => n.toLocaleString("fr-FR");

export function HeroDiagnostic() {
  const [q1, setQ1] = useState<Q1 | null>(null);
  const [q2, setQ2] = useState<Q2 | null>(null);
  const [q3, setQ3] = useState<Q3 | null>(null);

  const range = useMemo(() => {
    if (!q1 || !q2 || !q3) return null;
    const r = simulate({
      status: q1.status,
      tjmOrMonthlyGross: q1.status === "salarie_esn" ? q2.monthlyGross : q2.tjm,
      daysPerYear: 210,
      household: q3.household,
      // Typical optimisation levers for the flash estimate only.
      fraisReelsAnnual: 4_800,
      versementsPER: 4_000,
    });
    return r.economieRange;
  }, [q1, q2, q3]);

  const answer = <T,>(set: (v: T) => void, event: "diag_q1_answered" | "diag_q2_answered" | "diag_q3_answered") => (v: T) => {
    if (event === "diag_q1_answered" && !q1) trackEvent("diag_started");
    set(v);
    trackEvent(event);
    if (event === "diag_q3_answered") trackEvent("diag_completed");
  };

  const step = !q1 ? 1 : !q2 ? 2 : !q3 ? 3 : 4;

  return (
    <section className="bg-nuit text-creme">
      <div className="mx-auto max-w-page px-4 py-10 md:py-20">
        <p className="text-xs uppercase tracking-widest text-laiton">RD Portage — portage salarial 100 % légal</p>
        {/* Locked promise — do not rephrase. */}
        <h1 className="display mt-3 max-w-3xl text-3xl leading-tight md:text-5xl">
          Vous payez trop d&rsquo;impôts sans le savoir.
        </h1>
        <p className="mt-2 max-w-2xl font-sans text-base text-creme/90 md:text-lg">
          Calculez votre meilleur taux d&rsquo;imposition en 2 à 3 minutes. Gratuit, sans engagement.
        </p>

        <div className="filet mt-6 max-w-2xl pt-4">
          {step <= 3 && (
            <p className="mb-3 font-sans text-sm text-laiton tnum">Question {step} / 3 — une seule réponse, un seul geste.</p>
          )}

          {step === 1 && <Choices title="Votre statut actuel ?" options={Q1_OPTIONS} onPick={answer(setQ1, "diag_q1_answered")} />}
          {step === 2 && (
            <Choices title="Votre TJM (ou salaire brut mensuel) ?" options={Q2_OPTIONS} onPick={answer(setQ2, "diag_q2_answered")} />
          )}
          {step === 3 && <Choices title="Votre foyer ?" options={Q3_OPTIONS} onPick={answer(setQ3, "diag_q3_answered")} />}

          {step === 4 && range && (
            <div>
              <p className="font-sans text-sm text-creme/80">Estimation immédiate, à fourchette :</p>
              <p className="display mt-2 text-2xl leading-snug md:text-3xl">
                Vous laissez probablement entre{" "}
                <span className="text-laiton tnum">{eur(range.low)} €</span> et{" "}
                <span className="text-laiton tnum">{eur(range.high)} €</span> par an sur la table.
              </p>
              <p className="mt-2 text-sm text-creme/70">
                Fourchette indicative. Le calcul précis — foyer complet, frais réels, PER, dispositifs légaux — prend 2 à 3 minutes.
              </p>
              <Link href="/simulateur" className="cta-primary mt-4" onClick={() => trackEvent("sim_started", { from: "diag" })}>
                Calculer mon chiffre exact
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
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
    <fieldset>
      <legend className="display text-xl md:text-2xl">{title}</legend>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onPick(option)}
            className="rounded border border-laiton/60 bg-transparent px-4 py-3 text-left font-sans text-sm text-creme transition hover:bg-laiton hover:text-encre"
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
