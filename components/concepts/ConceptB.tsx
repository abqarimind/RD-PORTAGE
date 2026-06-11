"use client";

/**
 * CONCEPT B — « Le billet de 100 € ».
 * Pure 2D scrollytelling, no WebGL: 100 € you invoice, shown as a 10×10 grid
 * of golden squares. Scroll advances the story; at each beat the squares you
 * lose fall off the grid (staggered CSS transitions) and the breakdown is
 * spelled out. Fully responsive, runs anywhere — also the natural mobile
 * fallback for Concept A.
 * Figures derive from the same engine as the simulator (TJM 420 reference).
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { computePortage } from "@/lib/fiscal/portage";

const REF = computePortage({ tjm: 420, days: 20, ndf: 500, cagnotteMay: 1570, mealVouchers: true });
const REF_RAW = computePortage({ tjm: 420, days: 20 });
const YEARLY_GAP = Math.round((REF.globalCompensation - REF_RAW.netSalary) * 12);
const PCT_OPTIMISE = Math.round(REF.restitutionRate * 100); // 64 — sourced workbook

interface Beat {
  kicker: string;
  title: string;
  body: string;
  kept: number; // squares that stay, out of 100
  keptColor: string;
  breakdown: { label: string; value: string }[];
  footnote?: string;
}

const BEATS: Beat[] = [
  {
    kicker: "Votre journée de travail",
    title: "Voici 100 € que vous facturez.",
    body: "Hors taxes, gagnés par votre expertise. La seule question qui compte : combien finissent réellement chez vous — et savez-vous où passe le reste ?",
    kept: 100,
    keptColor: "#B08D57",
    breakdown: [{ label: "Facturé au client", value: "100 €" }],
  },
  {
    kicker: "Statut 1 — Salarié ESN",
    title: "La moitié disparaît dans la boîte.",
    body: "Marge de l'ESN, charges, structure : l'écart entre ce que paie le client et votre salaire est invisible par construction. Vous ne négociez jamais à armes égales.",
    kept: 50,
    keptColor: "#B08D57",
    breakdown: [
      { label: "Votre salaire net (ordre de grandeur)", value: "~50 €" },
      { label: "Marge + charges employeur", value: "opaque" },
    ],
    footnote: "Ordre de grandeur : les marges ESN ne sont pas publiques — c'est exactement le problème.",
  },
  {
    kicker: "Statut 2 — SASU / EURL",
    title: "Tout est visible. Tout est à votre charge.",
    body: "Cotisations, fiscalité, comptable, juridique — et les soirées de paperasse. Le mécanisme vous appartient, mais chaque rouage se paie et certains grippent.",
    kept: 52,
    keptColor: "#B08D57",
    breakdown: [
      { label: "Net dirigeant (modèle indicatif)", value: "~52 €" },
      { label: "Cotisations sociales", value: "~35 €" },
      { label: "Structure, comptable", value: "~5 €" },
      { label: "Votre temps administratif", value: "non chiffré" },
    ],
  },
  {
    kicker: "Statut 3 — Portage classique",
    title: "Transparent, mais cher et nu.",
    body: "8 % de frais de gestion en moyenne sur le marché, et aucune optimisation construite : votre euro est traité, pas travaillé.",
    kept: 49,
    keptColor: "#B08D57",
    breakdown: [
      { label: "Salaire net", value: "~49 €" },
      { label: "Charges sociales (votre future retraite, chômage…)", value: "~43 €" },
      { label: "Frais de gestion moyens du marché", value: "8 €" },
    ],
  },
  {
    kicker: "RD Portage — optimisé, dans les règles",
    title: `${PCT_OPTIMISE} € restitués. Chaque ligne tracée.`,
    body: "Mêmes 100 €, même URSSAF — mais 4 % de gestion, frais professionnels remboursés, titres-restaurant et cagnotte d'avantages plafonnée. Rien à cacher, tout à montrer.",
    kept: PCT_OPTIMISE,
    keptColor: "#2F6B4F",
    breakdown: [
      { label: "Salaire net", value: "~38 €" },
      { label: "Frais professionnels remboursés", value: "~6 €" },
      { label: "Titres-restaurant (net de votre part)", value: "~2 €" },
      { label: "Cagnotte avantages May", value: "~19 €" },
      { label: "Frais de gestion RD Portage", value: "4 €" },
    ],
    footnote: "Cas de référence TJM 420 €, 20 j/mois — simulation officielle RD Portage, arrondis à l'euro.",
  },
  {
    kicker: "Verdict",
    title: "", // live counter
    body: "Écart annuel entre un portage nu et RD Portage optimisé, calculé par le même moteur que notre simulateur. Votre chiffre exact dépend de votre foyer — il prend 2 à 3 minutes.",
    kept: PCT_OPTIMISE,
    keptColor: "#2F6B4F",
    breakdown: [],
  },
];

export function ConceptB() {
  const wrap = useRef<HTMLDivElement>(null);
  const [beat, setBeat] = useState(0);
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = wrap.current;
        if (!el) return;
        const total = el.offsetHeight - window.innerHeight;
        const p = Math.min(Math.max(-el.getBoundingClientRect().top / total, 0), 0.9999);
        setBeat(Math.floor(p * BEATS.length));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (beat !== BEATS.length - 1) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / 1400, 1);
      setCounter(Math.round(YEARLY_GAP * t * (2 - t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [beat]);

  const b = BEATS[beat];
  const isLast = beat === BEATS.length - 1;

  return (
    <div ref={wrap} className="relative bg-nuit" style={{ height: `${BEATS.length * 110}vh` }}>
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden px-4 py-8 md:px-12">
        <div className="mx-auto grid w-full max-w-page items-center gap-8 md:grid-cols-2">
          {/* ——— The grid of 100 euros. ——— */}
          <div>
            <div className="grid grid-cols-10 gap-1.5" aria-hidden>
              {Array.from({ length: 100 }).map((_, i) => {
                // Squares are kept bottom-up: index from bottom row.
                const fromBottom = 100 - 1 - i;
                const kept = fromBottom < b.kept;
                return (
                  <div
                    key={i}
                    className="aspect-square rounded-[1px] transition-all duration-700 ease-out"
                    style={{
                      backgroundColor: kept ? b.keptColor : "#F4EFE6",
                      opacity: kept ? 1 : 0.12,
                      transform: kept ? "translateY(0)" : `translateY(${22 + (i % 7) * 8}px) rotate(${(i % 5) - 2}deg)`,
                      transitionDelay: `${(i % 10) * 28 + Math.floor(i / 10) * 12}ms`,
                    }}
                  />
                );
              })}
            </div>
            <p className="mt-3 font-sans text-xs text-creme/60 tnum">
              {b.kept} € conservés sur 100 € facturés
            </p>
          </div>

          {/* ——— Narrative panel. ——— */}
          <div key={beat} className="animate-[fadeup_.45s_ease-out]">
            <p className="text-xs uppercase tracking-widest text-laiton">{b.kicker}</p>
            {isLast ? (
              <h2 className="display mt-2 text-3xl leading-tight text-creme md:text-5xl">
                Vous laissez <span className="tnum text-laiton">{counter.toLocaleString("fr-FR")} €</span> par an sur la
                table.
              </h2>
            ) : (
              <h2 className="display mt-2 text-2xl leading-tight text-creme md:text-4xl">{b.title}</h2>
            )}
            <p className="mt-3 max-w-md text-sm leading-relaxed text-creme/85 md:text-base">{b.body}</p>

            {b.breakdown.length > 0 && (
              <table className="mt-5 w-full max-w-md border-collapse text-sm">
                <tbody className="tnum">
                  {b.breakdown.map((row) => (
                    <tr key={row.label} className="border-t border-laiton/30 text-creme/80">
                      <td className="py-2 pr-3 font-sans">{row.label}</td>
                      <td className="py-2 text-right text-laiton">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {b.footnote && <p className="mt-3 max-w-md text-xs text-creme/50">{b.footnote}</p>}
            {isLast && (
              <Link href="/simulateur" className="cta-primary mt-6">
                Calculer mon chiffre exact — 2 à 3 minutes
              </Link>
            )}
          </div>
        </div>

        {/* Progress dots. */}
        <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col gap-2 md:flex">
          {BEATS.map((_, i) => (
            <div key={i} className={`h-8 w-px transition ${i <= beat ? "bg-laiton" : "bg-creme/20"}`} />
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeup {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
