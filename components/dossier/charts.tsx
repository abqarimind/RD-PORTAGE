"use client";

/**
 * Visuels du dossier — SVG inline, sans dépendance de graphes.
 *
 * Choix de forme (dans l'ordre imposé par la méthode dataviz) :
 *  - le chiffre d'accroche n'est PAS un graphique mais une tuile de stat ;
 *  - la cascade de paie est un waterfall : elle montre comment un montant de
 *    départ est réduit jusqu'au net perçu — c'est un flux, pas une catégorie ;
 *  - la comparaison des 3 scénarios est une barre horizontale à SÉRIE UNIQUE
 *    (une seule mesure, le disponible annuel, sur 3 catégories) : pas de
 *    légende, le titre nomme la mesure.
 *
 * Couleurs : strictement celles de la charte existante (§6 interdit d'y
 * toucher). Le couple BRASS/VALIDE passe les contrôles de séparation
 * daltonienne (ΔE 14,9 protan) et de vision normale (ΔE 21,4), mais reste
 * sous le seuil de chroma du validateur — d'où l'encodage secondaire
 * systématique : chaque marque porte son libellé et sa valeur en clair, la
 * couleur ne porte jamais l'information seule.
 */
import { useEffect, useRef } from "react";

const BRASS = "#B08D57";
const VALIDE = "#2F6B4F";
const INK = "#0B0D12";
const MUTED = "#7A8093";
const GRID = "#ECEEF3";

const eur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;

/* ————————————————————— cascade de paie (waterfall) ————————————————————— */

export interface CascadeStep {
  label: string;
  /** Montant du pas. Négatif = prélèvement, positif = apport. */
  delta: number;
  /** Vrai pour les paliers (CA HT, disponible, perçu net) : barre pleine. */
  total?: boolean;
}

export function Cascade({ steps }: { steps: CascadeStep[] }) {
  // Position cumulée de chaque barre, calculée une fois.
  const bars: { label: string; from: number; to: number; delta: number; total: boolean }[] = [];
  let running = 0;
  for (const s of steps) {
    if (s.total) {
      bars.push({ label: s.label, from: 0, to: s.delta, delta: s.delta, total: true });
      running = s.delta;
    } else {
      const next = running + s.delta;
      bars.push({ label: s.label, from: Math.min(running, next), to: Math.max(running, next), delta: s.delta, total: false });
      running = next;
    }
  }
  const max = Math.max(...bars.map((b) => b.to), 1);

  return (
    <div className="mt-4 space-y-2">
      {bars.map((b) => {
        const left = (b.from / max) * 100;
        const width = Math.max(((b.to - b.from) / max) * 100, 0.6);
        return (
          <div key={b.label} className="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[11rem_1fr_auto]">
            <span className="col-span-2 text-sm text-[#7A8093] sm:col-span-1 sm:text-right">{b.label}</span>
            <div className="relative h-7 w-full overflow-hidden rounded bg-[#F7F8FB]">
              <div
                className="absolute top-0 h-7 rounded"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  // Palier = teinte pleine ; prélèvement = laiton ; apport = vert.
                  backgroundColor: b.total ? INK : b.delta < 0 ? BRASS : VALIDE,
                  // 2 px de respiration entre marques adjacentes.
                  boxShadow: "0 0 0 2px #fff",
                }}
              />
            </div>
            {/* Encodage secondaire : la valeur est toujours écrite. */}
            <span
              className="text-sm font-semibold tabular-nums"
              style={{ color: b.total ? INK : b.delta < 0 ? MUTED : VALIDE }}
            >
              {b.total ? eur(b.delta) : `${b.delta < 0 ? "−" : "+"}${eur(Math.abs(b.delta))}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ————————————————— comparaison des scénarios (série unique) ————————————————— */

export interface ScenarioBar {
  label: string;
  value: number;
  best?: boolean;
}

export function ScenarioBars({ rows }: { rows: ScenarioBar[] }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  return (
    <div className="mt-4 space-y-4">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold" style={{ color: r.best ? VALIDE : INK }}>
              {r.label}
              {r.best && <span className="ml-2 text-xs font-bold uppercase tracking-wide">meilleur</span>}
            </span>
            <span className="text-sm font-bold tabular-nums" style={{ color: r.best ? VALIDE : MUTED }}>
              {eur(r.value)}
            </span>
          </div>
          <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full" style={{ backgroundColor: "#F7F8FB" }}>
            <div
              className="h-3 rounded-full"
              style={{
                width: `${(Math.abs(r.value) / max) * 100}%`,
                backgroundColor: r.best ? VALIDE : BRASS,
                boxShadow: "0 0 0 2px #fff",
              }}
            />
          </div>
        </div>
      ))}
      <p className="text-xs text-[#9aa0b0]">Disponible annuel = net perçu + avantages − impôt du foyer.</p>
    </div>
  );
}

/* ————————————————————— jauge du taux de restitution ————————————————————— */

export function RestitutionGauge({ rate }: { rate: number }) {
  const pctValue = Math.max(0, Math.min(rate, 1));
  const r = 52;
  const circumference = Math.PI * r; // demi-cercle
  const ref = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const target = circumference * (1 - pctValue);
    if (reduce) {
      el.style.strokeDashoffset = String(target);
      return;
    }
    el.style.strokeDashoffset = String(circumference);
    const id = requestAnimationFrame(() => {
      el.style.transition = "stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1)";
      el.style.strokeDashoffset = String(target);
    });
    return () => cancelAnimationFrame(id);
  }, [pctValue, circumference]);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 128 72" className="w-full max-w-[220px]" role="img" aria-label={`Taux de restitution : ${(pctValue * 100).toFixed(1)} %`}>
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={GRID}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference * 2}`}
          transform="rotate(180 64 64)"
        />
        <circle
          ref={ref}
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={VALIDE}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference * 2}`}
          strokeDashoffset={circumference}
          transform="rotate(180 64 64)"
        />
      </svg>
      <p className="-mt-6 text-3xl font-extrabold tabular-nums" style={{ color: VALIDE }}>
        {(pctValue * 100).toFixed(1).replace(".", ",")} %
      </p>
      <p className="mt-1 text-sm text-[#7A8093]">de votre CA vous revient</p>
    </div>
  );
}
