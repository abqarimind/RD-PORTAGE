"use client";

/**
 * Section 2 — TRANSPARENCE. Emotional pivot from fear to reassurance.
 * The copy is self-sufficient (works without 3D). The Three.js scene is
 * lazy-loaded only when: WebGL available, no prefers-reduced-motion, and the
 * section enters the viewport. Bundle stays out of the critical path.
 */
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false, loading: () => null });

const MECHANISMS = [
  {
    title: "Salariat",
    body:
      "Une boîte opaque : votre employeur encaisse, un net tombe. Ce qui se passe entre les deux — charges, marges, refacturation — vous ne le voyez jamais.",
  },
  {
    title: "Freelance / SASU",
    body:
      "Un mécanisme enchevêtré : URSSAF, comptable, juridique, TVA. Chaque rouage se paie, certains grippent, et des pièces tombent — en pénalités ou en temps perdu.",
  },
  {
    title: "Portage RD",
    body:
      "Un rouage unique et transparent : chaque euro est visible de l'entrée à la sortie. 4 % de frais de gestion, charges affichées, optimisations tracées ligne à ligne.",
  },
];

export function TransparencySection() {
  const ref = useRef<HTMLDivElement>(null);
  const [show3D, setShow3D] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = document.createElement("canvas");
    const webgl = !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    if (reduced || !webgl) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow3D(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="bg-nuit text-creme">
      <div className="mx-auto max-w-page px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-widest text-laiton">Trois mécanismes, un seul transparent</p>
        <h2 className="display mt-2 max-w-2xl text-2xl md:text-4xl">
          Où passe votre argent, exactement ?
        </h2>

        {show3D && (
          <div className="mt-8 hidden h-[420px] md:block" aria-hidden>
            <Scene3D />
          </div>
        )}

        <div className="mt-8 grid gap-px overflow-hidden border border-laiton/40 bg-laiton/40 md:grid-cols-3">
          {MECHANISMS.map((m, i) => (
            <div key={m.title} className="bg-nuit p-6">
              <p className="display text-laiton tnum">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="display mt-1 text-xl">{m.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-creme/85">{m.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
