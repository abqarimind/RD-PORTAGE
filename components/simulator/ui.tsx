"use client";

/**
 * Briques d'interface du simulateur.
 *
 * BUG-05 est corrigé ici, une fois, pour tous les champs de montant :
 *  - `type="text"` + `inputMode="numeric"` → clavier numérique natif iOS et
 *    Android, et SURTOUT aucun spinner/molette (c'est `type="number"` qui
 *    déclenchait le comportement molette signalé par l'utilisateur) ;
 *  - `font-size: 16px` minimum sur tous les champs → pas de zoom automatique
 *    iOS à la focalisation ;
 *  - toutes les cibles tactiles à 44 × 44 px minimum ;
 *  - le curseur reste un moyen COMPLÉMENTAIRE d'ajustement, jamais le seul
 *    moyen de saisie.
 */
import { useEffect, useId, useState } from "react";
import { groupFr } from "@/lib/format";

export const PEACH = "#FFF1DE";
export const MINT = "#E7F6EE";
export const INK = "#0B0D12";
export const BRASS = "#B08D57";
export const VALIDE = "#2F6B4F";
export const ALERTE = "#B3261E";
export const SANS = "'Manrope','IBM Plex Sans',sans-serif";

export const eur = (n: number) => groupFr(n);
export const pct = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")} %`;
/** Montant signé, pour tout ce qui peut être négatif (l'écart §BUG-02). */
export const eurSigned = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${groupFr(Math.abs(n))}`;

export const PRIMARY_BTN =
  "inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#0B0D12] px-6 py-3 text-center text-base font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60";
export const OUTLINE_BTN =
  "inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#D8DCE6] bg-white px-6 py-3 text-center text-base font-bold text-[#0B0D12] transition-colors hover:border-[#B08D57]";
export const GHOST_BTN =
  "inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-sm font-bold text-[#7A8093] underline underline-offset-4 transition-colors hover:text-[#0B0D12]";

/**
 * `htmlFor` associe le libellé à son champ. Sans lui, un <label> reste
 * décoratif : les lecteurs d'écran n'annoncent rien, le remplissage
 * automatique iOS ne reconnaît pas le champ, et taper sur le libellé ne donne
 * pas le focus. Les groupes de boutons (Segmented, Stepper) n'ont pas de
 * champ unique à cibler et s'en passent légitimement.
 */
export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-base font-bold text-[#0B0D12]">
        {label}
      </label>
      {hint && <p className="mb-2 mt-0.5 text-sm leading-snug text-[#7A8093]">{hint}</p>}
      <div className={hint ? "" : "mt-2"}>{children}</div>
    </div>
  );
}

export function Screen({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-[#7A8093]">{subtitle}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

/**
 * Normalise une saisie libre en nombre : accepte « 640 », « 640 € »,
 * « 1 200 », « 1.200 », « 640,5 ». Renvoie null si rien d'exploitable, pour
 * que le champ puisse rester vide pendant la frappe sans se réécrire tout seul.
 */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
  if (cleaned === "" || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Champ de montant — clavier numérique natif, sans molette ni spinner.
 * Le curseur d'ajustement est optionnel et toujours secondaire.
 */
export function AmountInput({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  suffix = "€",
  withSlider = true,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  withSlider?: boolean;
  onChange: (v: number) => void;
}) {
  // Tampon de frappe : l'utilisateur doit pouvoir effacer le champ et taper
  // « 640 » sans que la valeur ne soit réécrite à chaque caractère.
  const [draft, setDraft] = useState<string>(String(value));
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const id = useId();
  const clamp = (v: number) => Math.min(Math.max(Number.isFinite(v) ? v : min, min), max);

  const commit = (raw: string) => {
    const parsed = parseAmount(raw);
    if (parsed === null) {
      setDraft(String(value));
      return;
    }
    const next = clamp(parsed);
    setDraft(String(next));
    onChange(next);
  };

  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            // JAMAIS type="number" : c'est lui qui déclenche molette + spinner.
            id={id}
            type="text"
            inputMode="numeric"
            pattern="[0-9 .,]*"
            autoComplete="off"
            enterKeyHint="done"
            aria-label={label}
            className="sim-input sim-input--suffix text-right tabular-nums"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              const parsed = parseAmount(e.target.value);
              // Mise à jour live tant que la valeur reste dans les bornes :
              // l'aperçu suit la frappe sans jamais corriger le champ.
              if (parsed !== null && parsed >= min && parsed <= max) onChange(parsed);
            }}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base font-semibold text-[#7A8093]">
            {suffix}
          </span>
        </div>
      </div>
      {withSlider && (
        <div className="mt-3">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={Math.min(Math.max(value, min), max)}
            onChange={(e) => onChange(clamp(Number(e.target.value)))}
            className="sim-range w-full"
            aria-label={`${label} — ajustement`}
          />
          <div className="mt-1 flex justify-between text-xs tabular-nums text-[#9aa0b0]">
            <span>
              {eur(min)} {suffix}
            </span>
            <span>
              {eur(max)} {suffix}
            </span>
          </div>
        </div>
      )}
    </Field>
  );
}

export function Segmented({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  columns?: number;
}) {
  return (
    <div className={`grid gap-2 ${columns === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-[48px] rounded-xl border px-3 py-3 text-sm font-semibold transition-[background-color,border-color,color,transform,box-shadow] duration-150 ${
            value === o.value
              ? "border-transparent bg-[#0B0D12] text-white"
              : "border-[#E2E5EE] bg-white text-[#0B0D12] hover:border-[#B08D57]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, max = 12 }: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="h-12 w-12 rounded-full border border-[#E2E5EE] text-xl transition-colors hover:border-[#B08D57] disabled:opacity-40"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        aria-label="Diminuer"
      >
        −
      </button>
      <span className="w-8 text-center text-xl font-extrabold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="h-12 w-12 rounded-full border border-[#E2E5EE] text-xl transition-colors hover:border-[#B08D57] disabled:opacity-40"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Augmenter"
      >
        +
      </button>
    </div>
  );
}

/** Styles globaux du simulateur — 16 px mini sur les champs (anti-zoom iOS). */
export function SimulatorStyles() {
  return (
    <style jsx global>{`
      .sim-input {
        width: 100%;
        min-height: 48px;
        border: 1px solid #e2e5ee;
        border-radius: 12px;
        background: #fff;
        padding: 0.75rem 1rem;
        /* 16px strict : en dessous, iOS zoome automatiquement au focus. */
        font-size: 16px;
        line-height: 1.4;
        color: #0b0d12;
      }
      /*
       * Champ avec unité (€, j) posée en absolu à droite. Le retrait doit
       * vivre ICI, avec une spécificité supérieure à .sim-input : un utilitaire
       * Tailwind (l'ancien pr-9) était écrasé par le « padding » ci-dessus,
       * injecté après la feuille Tailwind — le chiffre passait sous le « € »
       * (retour client : « 500€ » illisible).
       */
      .sim-input.sim-input--suffix {
        padding-right: 2.5rem;
      }
      .sim-input:focus {
        outline: none;
        border-color: #b08d57;
        box-shadow: 0 0 0 3px rgba(176, 141, 87, 0.15);
      }
      .sim-range {
        -webkit-appearance: none;
        appearance: none;
        height: 6px;
        border-radius: 999px;
        background: #ede3d2;
        outline: none;
      }
      .sim-range::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #0b0d12;
        border: 3px solid #fff;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
        cursor: pointer;
      }
      .sim-range::-moz-range-thumb {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #0b0d12;
        border: 3px solid #fff;
        cursor: pointer;
      }
      .step-enter {
        animation: stepIn 0.28s ease-out;
      }
      @keyframes stepIn {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .step-enter {
          animation: none;
        }
      }
    `}</style>
  );
}
