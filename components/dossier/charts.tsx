"use client";

/**
 * Visuels du dossier — SVG/CSS inline, sans dépendance de graphes.
 *
 * Choix de forme (dans l'ordre imposé par la méthode dataviz) :
 *  - le chiffre d'accroche n'est PAS un graphique mais une tuile de stat ;
 *  - « où vont vos X € » est une part-à-tout, donc une barre empilée
 *    horizontale, en EMPHASE : une seule marque porte l'accent (la part qui
 *    revient à la personne), le reste est du contexte sur une rampe laiton.
 *    C'est la lecture à une seconde ;
 *  - le détail est une cascade (waterfall) avec connecteurs : elle montre
 *    comment le montant de départ est réduit jusqu'au net perçu. Les
 *    connecteurs sont ce qui rend l'escalier lisible — sans eux, les barres
 *    flottantes ressemblent à des positions arbitraires ;
 *  - la comparaison des 3 scénarios est une barre horizontale à SÉRIE UNIQUE.
 *
 * Couleurs : celles de la charte. Le validateur de palette refuse un
 * troisième ton catégoriel (gris ↔ laiton : ΔE 12,8 en vision normale, sous
 * le plancher de 15) — d'où le passage en emphase, avec le contexte sur deux
 * pas de LUMINOSITÉ du même laiton plutôt que sur deux teintes concurrentes.
 * Le couple accent/contexte passe les contrôles (ΔE 14,9 protan, 21,4 en
 * vision normale) mais reste sous le plancher de chroma : l'encodage
 * secondaire est donc systématique — chaque marque porte son libellé et sa
 * valeur en clair, la couleur ne porte jamais l'information seule.
 */
import { Fragment, useEffect, useRef } from "react";
import { buildCascadeBars, type CascadeStep, type PartagePart } from "@/lib/dossier/breakdown";
import { groupFr } from "@/lib/format";

export type { CascadeStep, PartagePart };

const BRASS = "#B08D57";
/** Pas clair de la MÊME rampe laiton — contexte secondaire, pas une teinte de plus. */
const BRASS_LIGHT = "#DCCCB3";
const VALIDE = "#2F6B4F";
const INK = "#0B0D12";
const MUTED = "#7A8093";
const GRID = "#ECEEF3";

const eur = (n: number) => `${groupFr(n)}\u00A0€`;
const part = (n: number, total: number) => (total > 0 ? `${Math.round((n / total) * 100)} %` : "—");

/* ————————————————— où va le CA (part-à-tout, en emphase) ————————————————— */

/**
 * Trame laiton — canal de secours d'accessibilité, pas une décoration.
 *
 * Le troisième bloc ne peut pas être un troisième ton : un laiton assez
 * clair pour se distinguer du laiton plein tombe à 1,6:1 sur blanc, et un
 * laiton assez foncé pour tenir le contraste ne se distingue plus du plein.
 * La trame tranche le nœud : le contraste vient des traits pleins, la
 * différence vient du motif, et elle reste lisible en daltonisme, à
 * l'impression et en `forced-colors`.
 */
const TRAME = `repeating-linear-gradient(45deg, ${BRASS} 0 3px, #FFFFFF 3px 6px)`;

function fondDePart(p: PartagePart, i: number, total: number) {
  if (p.accent) return { backgroundColor: VALIDE };
  // Le dernier bloc (le plus petit, les frais) porte la trame.
  return i === total - 1 ? { backgroundImage: TRAME } : { backgroundColor: BRASS };
}

/**
 * Barre empilée unique. Les parts DOIVENT totaliser `total` : c'est au
 * composant appelant de garantir l'égalité (en calculant une part par
 * différence), pas au graphe de la maquiller.
 */
export function PartageBar({ total, parts, hint }: { total: number; parts: PartagePart[]; hint?: string }) {
  const somme = parts.reduce((acc, p) => acc + p.value, 0);

  return (
    <figure className="m-0 mt-5">
      {/* `flex-grow` proportionnel plutôt que des largeurs en % : les 2 px de
          respiration ne font alors pas déborder le total. */}
      <div
        className="flex h-11 w-full gap-[2px] overflow-hidden rounded-lg"
        role="img"
        aria-label={`Répartition de ${eur(total)} : ${parts.map((p) => `${p.label}, ${eur(p.value)}`).join(" ; ")}`}
      >
        {parts.map((p, i) => {
          const share = somme > 0 ? p.value / somme : 0;
          return (
            <div
              key={p.label}
              className="relative flex h-11 min-w-[4px] items-center justify-center"
              style={{ flexGrow: Math.max(p.value, 0), flexBasis: 0, ...fondDePart(p, i, parts.length) }}
              title={`${p.label} — ${eur(p.value)} (${part(p.value, total)})`}
            >
              {/* Libellé intérieur réservé à la marque accentuée, et seulement
                  si la place est franche : un libellé rogné est pire que pas
                  de libellé (la légende ci-dessous porte toutes les valeurs). */}
              {p.accent && share >= 0.28 && (
                <span className="px-2 text-sm font-bold text-white sm:text-base">{eur(p.value)}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Légende — canal d'identité fiable, indépendant de la couleur. */}
      <figcaption className="mt-4 space-y-3">
        {parts.map((p, i) => (
          <div key={p.label} className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-baseline gap-2.5">
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 self-center rounded-[3px] ring-1 ring-inset ring-black/10"
                style={fondDePart(p, i, parts.length)}
              />
              <span className="min-w-0">
                <span
                  className={p.accent ? "text-sm font-bold" : "text-sm"}
                  style={{ color: p.accent ? INK : "#4A5061" }}
                >
                  {p.label}
                </span>
                {p.note && <span className="block text-xs text-[#9aa0b0]">{p.note}</span>}
              </span>
            </span>
            <span className="shrink-0 whitespace-nowrap text-right">
              <span
                className={`tabular-nums ${p.accent ? "text-base font-extrabold" : "text-sm font-semibold"}`}
                style={{ color: p.accent ? INK : "#4A5061" }}
              >
                {eur(p.value)}
              </span>
              <span className="ml-2 text-xs tabular-nums text-[#9aa0b0]">{part(p.value, total)}</span>
            </span>
          </div>
        ))}
      </figcaption>

      {hint && <p className="mt-4 border-t border-[#ECEEF3] pt-3 text-sm text-[#4A5061]">{hint}</p>}
    </figure>
  );
}

/* ————————————————————— cascade de paie (waterfall) ————————————————————— */

export function Cascade({ steps }: { steps: CascadeStep[] }) {
  const { bars, ecarts } = buildCascadeBars(steps);
  const max = Math.max(...bars.map((b) => b.to), 1);

  if (process.env.NODE_ENV !== "production" && ecarts.length > 0) {
    console.error("[dossier] la cascade ne boucle pas :", ecarts.join(" ; "));
  }

  return (
    /*
     * UNE SEULE grille pour toute la cascade.
     *
     * Une grille par ligne donnait à la colonne des montants une largeur
     * dictée par son seul contenu : « −76 € » laissait plus de place au tracé
     * que « −2 501 € ». Chaque ligne avait donc sa propre échelle, et le
     * recul d'une marche à l'autre était faux — visible surtout au téléphone,
     * où le libellé passe au-dessus et où la colonne des montants partage la
     * ligne avec le tracé. Une grille unique force toutes les barres sur la
     * même piste.
     */
    <div className="mt-4 grid grid-cols-[1fr_auto] gap-x-3 sm:grid-cols-[12rem_1fr_auto]">
      {bars.map((b, i) => {
        const left = (b.from / max) * 100;
        const width = Math.max(((b.to - b.from) / max) * 100, 0.4);
        const epaisseur = b.total ? 22 : 14;
        // Un palier ouvre une étape : filet de séparation sur toute la ligne.
        const filet = b.total && i > 0;

        return (
          <Fragment key={`${b.label}-${i}`}>
            {/* Libellé — le gras et la couleur d'encre distinguent le palier du pas. */}
            <span
              className={`col-span-2 self-center pt-2 leading-tight sm:col-span-1 sm:pt-0 sm:text-right ${
                filet ? "border-t border-[#ECEEF3]" : ""
              } ${b.total ? "text-sm font-bold sm:text-[15px]" : "pl-3 text-sm sm:pl-0"}`}
              style={{ color: b.total ? INK : MUTED }}
            >
              {b.label}
            </span>

            {/* Zone de tracé. Même largeur sur toutes les lignes, donc même
                échelle : c'est ce qui rend le recul juste. */}
            <div
              className={`relative w-full ${b.total ? "min-h-[2.75rem]" : "min-h-[2.25rem]"} ${
                filet ? "sm:border-t sm:border-[#ECEEF3]" : ""
              }`}
            >
              {/* Rail de fond : il matérialise le CA HT en entier, donc la
                  référence par rapport à laquelle chaque marche recule. */}
              <div
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded"
                style={{ height: epaisseur, backgroundColor: "#F7F8FB" }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 rounded"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  // Plancher en pixels, pas en pourcentage : un petit
                  // prélèvement reste visible sans que sa position mente.
                  minWidth: 2,
                  height: epaisseur,
                  // Palier = encre pleine ; prélèvement = laiton ; apport = vert.
                  backgroundColor: b.total ? INK : b.delta < 0 ? BRASS : VALIDE,
                }}
              />
            </div>

            {/* Encodage secondaire : la valeur est toujours écrite, en jeton de
                texte (jamais dans la couleur de la donnée). */}
            <span
              className={`self-center whitespace-nowrap text-right tabular-nums ${
                filet ? "sm:border-t sm:border-[#ECEEF3]" : ""
              } ${b.total ? "text-[15px] font-extrabold sm:text-base" : "text-sm font-semibold"}`}
              style={{ color: b.total ? INK : MUTED }}
            >
              {b.total ? eur(b.delta) : `${b.delta < 0 ? "−" : "+"}${eur(Math.abs(b.delta))}`}
            </span>
          </Fragment>
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
              style={{ width: `${(Math.abs(r.value) / max) * 100}%`, backgroundColor: r.best ? VALIDE : BRASS }}
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
