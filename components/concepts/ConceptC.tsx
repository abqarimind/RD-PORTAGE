"use client";

/**
 * CONCEPT C — light fintech variant, interactive v2 (client feedback round 1):
 * - Hero: real Three.js phone that tilts toward the mouse; inside, the
 *   simulation figures spin like a slot machine before settling; badge pops
 *   in 3D on hover.
 * - "Vos 3 scénarios": bars slide in + fill on scroll.
 * - "Trois étapes": GSAP pinned horizontal scroll with oversized typography
 *   (desktop); stacked cards on mobile.
 * - Initials avatars everywhere images are pending (hero cluster, trust
 *   band, testimonials) — real photos swap in later.
 * - Common-sense entrance animations per section: central blocks from
 *   top/bottom, side blocks from their edge toward the center.
 * Figures still computed by the real fiscal engine (TJM-420 reference).
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, RoundedBox } from "@react-three/drei";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Group } from "three";
import { MathUtils } from "three";
import { computePortage } from "@/lib/fiscal/portage";

const REF = computePortage({ tjm: 420, days: 20, ndf: 500, cagnotteMay: 1570, mealVouchers: true });
const REF_RAW = computePortage({ tjm: 420, days: 20 });
const YEARLY_GAP = Math.round((REF.globalCompensation - REF_RAW.netSalary) * 12);
const PCT = Math.round(REF.restitutionRate * 100);
const eur = (n: number) => n.toLocaleString("fr-FR");

const PEACH = "#FFF1DE";
const LILAC = "#EFF0FB";
const MINT = "#E7F6EE";
const ROSE = "#FDE8E4";
const INK = "#0B0D12";

/* ————————————————————————— shared bits ————————————————————————— */

/** Directional entrance on first viewport intersection. */
function Reveal({
  children,
  from = "up",
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  from?: "up" | "down" | "left" | "right";
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVis(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const offset = { up: "translateY(40px)", down: "translateY(-40px)", left: "translateX(-56px)", right: "translateX(56px)" }[from];
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? "none" : offset,
        transition: `opacity .75s ease-out ${delay}ms, transform .75s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** Colored circle with initials — stand-in until real portraits/logos. */
function InitialsAvatar({
  initials,
  bg,
  size = 40,
  className = "",
}: {
  initials: string;
  bg: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-extrabold text-[#3A3F4E] ring-2 ring-white ${className}`}
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.34 }}
    >
      {initials}
    </span>
  );
}

function Pill({ children, dark = false, href = "/simulateur" }: { children: React.ReactNode; dark?: boolean; href?: string }) {
  return (
    <Link
      href={href}
      className={`inline-block rounded-full px-6 py-3 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
        dark ? "bg-[#0B0D12] text-white hover:bg-[#23262F]" : "border border-[#D8DCE6] bg-white text-[#0B0D12] hover:border-[#B08D57]"
      }`}
    >
      {children}
    </Link>
  );
}

function Scribble() {
  return (
    <svg viewBox="0 0 220 14" className="absolute -bottom-2 left-0 w-full" aria-hidden>
      <path d="M4 9 C 60 2, 150 2, 216 7" fill="none" stroke="#B08D57" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/* ————————————————— slot-machine digits ————————————————— */

function Digit({ d, run, delay }: { d: number; run: boolean; delay: number }) {
  const start = useRef(Math.floor(Math.random() * 10));
  return (
    <span className="inline-block overflow-hidden align-bottom" style={{ height: "1em" }}>
      <span
        className="block"
        style={{
          transform: run ? `translateY(-${10 + d}em)` : `translateY(-${start.current}em)`,
          transition: run ? `transform 1.7s cubic-bezier(.15,.85,.25,1) ${delay}ms` : "none",
        }}
      >
        {Array.from({ length: 21 }).map((_, i) => (
          <span key={i} className="block" style={{ height: "1em", lineHeight: "1em" }}>
            {i % 10}
          </span>
        ))}
      </span>
    </span>
  );
}

/** Renders "5 391 €" with every digit rolling like a slot machine. */
function SlotValue({ value, run, baseDelay = 0 }: { value: string; run: boolean; baseDelay?: number }) {
  let digitIndex = 0;
  return (
    <span className="tabular-nums" style={{ lineHeight: 1 }}>
      {value.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <Digit key={i} d={Number(ch)} run={run} delay={baseDelay + digitIndex++ * 110} />
        ) : (
          <span key={i}>{ch === " " ? " " : ch}</span>
        ),
      )}
    </span>
  );
}

/* ————————————————— 3D phone (hero) ————————————————— */

function PhoneModel({ pointer, run }: { pointer: React.MutableRefObject<{ x: number; y: number }>; run: boolean }) {
  const g = useRef<Group>(null);
  useFrame(() => {
    if (!g.current) return;
    g.current.rotation.y = MathUtils.lerp(g.current.rotation.y, pointer.current.x * 0.42, 0.08);
    g.current.rotation.x = MathUtils.lerp(g.current.rotation.x, -pointer.current.y * 0.28, 0.08);
  });
  return (
    <group ref={g}>
      <RoundedBox args={[2.45, 4.95, 0.17]} radius={0.14} smoothness={6}>
        <meshStandardMaterial color={INK} metalness={0.45} roughness={0.32} />
      </RoundedBox>
      {/* camera notch */}
      <mesh position={[0, 2.18, 0.095]}>
        <capsuleGeometry args={[0.045, 0.28, 4, 8]} />
        <meshStandardMaterial color="#23262F" roughness={0.6} />
      </mesh>
      <Html transform position={[0, 0, 0.092]} distanceFactor={1.62} style={{ width: 300 }} className="select-none">
        <div className="rounded-[26px] bg-white p-4 shadow-2xl" style={{ width: 300, fontFamily: "'Manrope',sans-serif", color: INK }}>
          <div className="flex items-center justify-between text-[10px] font-bold text-[#7A8093]">
            <span>9:41</span>
            <span>Votre simulation</span>
          </div>
          <p className="mt-3 text-[11px] font-semibold text-[#7A8093]">Rémunération globale / mois</p>
          <p className="mt-1 text-[34px] font-extrabold">
            <SlotValue value={`${eur(REF.globalCompensation)} €`} run={run} />
          </p>
          {/* Badge — pops in 3D on hover. */}
          <span
            className="mt-2 inline-block cursor-default rounded-full px-2.5 py-1 text-[11px] font-bold transition-transform duration-300 [transform-style:preserve-3d] hover:[transform:perspective(420px)_rotateX(16deg)_rotateY(-12deg)_translateZ(14px)_scale(1.08)] hover:shadow-lg"
            style={{ backgroundColor: MINT, color: "#2F6B4F" }}
          >
            {PCT}&nbsp;% du CA restitué
          </span>
          <div className="mt-3 space-y-1.5 text-[11px] font-medium">
            {[
              ["Salaire net", `${eur(REF.netSalary)} €`, 350],
              ["Frais remboursés", `${eur(REF.ndf)} €`, 550],
              ["Avantages May", `${eur(REF.cagnotteMay)} €`, 750],
              ["Frais de gestion (4 %)", `−${eur(REF.managementFee)} €`, 950],
            ].map(([l, v, dl]) => (
              <div key={l as string} className="flex justify-between rounded-xl bg-[#F6F7FA] px-3 py-2">
                <span className="text-[#4A5061]">{l}</span>
                <span className="font-bold">
                  <SlotValue value={v as string} run={run} baseDelay={dl as number} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </Html>
    </group>
  );
}

function PhoneCard() {
  const pointer = useRef({ x: 0, y: 0 });
  const wrap = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(false);
  const [webgl, setWebgl] = useState(true);

  useEffect(() => {
    const c = document.createElement("canvas");
    setWebgl(!!(c.getContext("webgl2") || c.getContext("webgl")));
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setTimeout(() => setRun(true), 350);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={wrap}
      className="rounded-3xl p-4 md:p-6"
      style={{ backgroundColor: PEACH }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        pointer.current = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 };
      }}
      onPointerLeave={() => (pointer.current = { x: 0, y: 0 })}
    >
      <div className="h-[480px] md:h-[520px]">
        {webgl ? (
          <Canvas camera={{ position: [0, 0, 5.4], fov: 42 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
            <ambientLight intensity={0.95} />
            <directionalLight position={[3, 4, 5]} intensity={1.2} />
            <PhoneModel pointer={pointer} run={run} />
          </Canvas>
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-semibold text-[#8A6B3F]">
            Rémunération globale : {eur(REF.globalCompensation)} €/mois — {PCT} % du CA restitué.
          </div>
        )}
      </div>
      <p className="text-xs font-semibold text-[#8A6B3F]">
        Cas de référence TJM 420 € — calculé par notre moteur, pas par le marketing.
      </p>
    </div>
  );
}

/* ————————————————— scenario bars (scroll reveal) ————————————————— */

function ScenarioCard() {
  const wrap = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVis(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const rows: [string, number, string][] = [
    ["Statut actuel", 51, "#C9CEDA"],
    ["Portage classique", 49, "#C9CEDA"],
    ["RD Portage optimisé", PCT, "#B08D57"],
  ];

  return (
    <div ref={wrap} className="flex flex-col rounded-3xl p-6 text-left md:p-8" style={{ backgroundColor: LILAC }}>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Vos 3 scénarios</p>
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-bold transition-all duration-700"
            style={{ backgroundColor: MINT, color: "#2F6B4F", opacity: vis ? 1 : 0, transform: vis ? "none" : "scale(.7)" }}
          >
            + {eur(YEARLY_GAP)} €/an
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {rows.map(([label, value, color], i) => (
            <div
              key={label}
              style={{
                opacity: vis ? 1 : 0,
                transform: vis ? "none" : "translateX(48px)",
                transition: `opacity .6s ease-out ${i * 180}ms, transform .6s ease-out ${i * 180}ms`,
              }}
            >
              <div className="flex justify-between text-[11px] font-semibold text-[#4A5061]">
                <span>{label}</span>
                <span className="tabular-nums">{value} € / 100 € facturés</span>
              </div>
              <div className="mt-1 h-2.5 w-full rounded-full bg-[#F0F1F5]">
                <div
                  className="h-2.5 rounded-full"
                  style={{
                    width: vis ? `${value}%` : "0%",
                    backgroundColor: color,
                    transition: `width 1.1s cubic-bezier(.2,.7,.2,1) ${200 + i * 180}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-auto pt-4 text-xs font-semibold text-[#4A5061]">
        Le seul simulateur qui calcule le taux d&rsquo;imposition réel de votre foyer : enfants, garde alternée, frais réels, PER, impatrié.
      </p>
    </div>
  );
}

/* ————————————————— GSAP horizontal steps ————————————————— */

const STEPS = [
  {
    tint: PEACH,
    accent: "#8A6B3F",
    num: "01",
    title: "Diagnostic flash",
    body: "3 questions, 30 secondes, zéro email demandé : une première fourchette de ce que vous laissez sur la table chaque année.",
    tiles: ["Votre statut ?", "Votre TJM ?", "Votre foyer ?"],
  },
  {
    tint: LILAC,
    accent: "#4A4F8C",
    num: "02",
    title: "Simulateur foyer",
    body: "2-3 minutes pour le calcul complet : situation familiale, garde alternée, frais réels, PER, impatrié — plafonds légaux inclus.",
    tiles: ["Quotient familial", "Frais réels vs 10 %", "PER plafonné"],
  },
  {
    tint: MINT,
    accent: "#2F6B4F",
    num: "03",
    title: "Diagnostic 30 min",
    body: "Vous validez votre chiffre avec Ridha, le fondateur (ex-porté). Proposition ferme — signature possible sous 48 h.",
    tiles: ["Visio 30 min", "Proposition ferme", "Signature 48 h"],
  },
];

function HorizontalSteps() {
  const wrap = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add("(min-width: 768px)", () => {
      const t = track.current!;
      const w = wrap.current!;
      const dist = () => t.scrollWidth - window.innerWidth;
      const tween = gsap.to(t, {
        x: () => -dist(),
        ease: "none",
        scrollTrigger: {
          trigger: w,
          start: "top top",
          end: () => `+=${dist()}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      gsap.utils.toArray<HTMLElement>(".step-panel").forEach((panel) => {
        gsap.fromTo(
          panel.querySelectorAll(".step-anim"),
          { y: 70, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.1,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: panel, containerAnimation: tween, start: "left 75%" },
          },
        );
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <section id="methode" ref={wrap} className="overflow-hidden bg-white">
      <div
        ref={track}
        className="flex flex-col gap-6 px-4 py-16 md:h-screen md:flex-row md:flex-nowrap md:items-center md:gap-[4vw] md:py-0 md:pl-[8vw] md:pr-[12vw]"
      >
        {/* Intro panel */}
        <div className="md:min-w-[34vw]">
          <Reveal from="up">
            <p className="text-xs font-bold uppercase tracking-widest text-[#B08D57]">La méthode</p>
            <h2 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Trois étapes,
              <br />
              <span className="relative inline-block">
                zéro zone grise
                <Scribble />
              </span>
            </h2>
            <p className="mt-4 hidden items-center gap-2 text-sm font-semibold text-[#7A8093] md:flex">
              Continuez à défiler
              <svg width="28" height="12" viewBox="0 0 28 12" aria-hidden>
                <path d="M0 6h24m0 0-5-5m5 5-5 5" stroke="#B08D57" strokeWidth="2" fill="none" />
              </svg>
            </p>
          </Reveal>
        </div>

        {STEPS.map((s) => (
          <div
            key={s.num}
            className="step-panel group relative flex flex-col justify-between overflow-hidden rounded-3xl p-7 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl md:h-[72vh] md:min-w-[56vw] md:p-12"
            style={{ backgroundColor: s.tint }}
          >
            <p
              className="step-anim pointer-events-none absolute -right-4 -top-10 select-none text-[38vw] font-extrabold leading-none md:-top-16 md:text-[17rem]"
              style={{ color: s.accent, opacity: 0.14 }}
            >
              {s.num}
            </p>
            <div className="relative">
              <p className="step-anim text-xs font-bold uppercase tracking-widest" style={{ color: s.accent }}>
                Étape {s.num}
              </p>
              <h3 className="step-anim mt-2 text-3xl font-extrabold tracking-tight md:text-6xl">{s.title}</h3>
              <p className="step-anim mt-4 max-w-md text-sm leading-relaxed text-[#4A5061] md:text-base">{s.body}</p>
            </div>
            <div className="relative mt-8 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {s.tiles.map((tile) => (
                <div
                  key={tile}
                  className="step-anim rounded-2xl bg-white/80 px-4 py-3 text-sm font-bold backdrop-blur transition-transform duration-200 hover:scale-[1.04]"
                >
                  {tile}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ————————————————— page ————————————————— */

const TEAM_AVATARS = [
  { initials: "KB", bg: PEACH },
  { initials: "SM", bg: LILAC },
  { initials: "YT", bg: MINT },
  { initials: "LP", bg: ROSE },
];

const TRUST_AVATARS = [
  { initials: "AT", bg: PEACH },
  { initials: "CG", bg: LILAC },
  { initials: "SQ", bg: MINT },
  { initials: "OR", bg: ROSE },
  { initials: "DV", bg: "#E9F1FD" },
  { initials: "KM", bg: "#F3E9FD" },
];

export function ConceptC() {
  return (
    <main style={{ fontFamily: "'Manrope','IBM Plex Sans',sans-serif", color: INK }} className="bg-white">
      {/* Prototype banner */}
      <div className="border-b border-[#ECEEF3] bg-white">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-[#7A8093]">
          <p>
            <span className="font-bold text-[#B08D57]">Prototype interne</span> — Concept C, variante UI fintech claire (v2 animée)
          </p>
          <p>
            <Link href="/concept-a" className="underline">Concept A</Link>
            {" · "}
            <Link href="/concept-b" className="underline">Concept B</Link>
            {" · "}
            <Link href="/" className="underline">Landing actuelle</Link>
          </p>
        </div>
      </div>

      {/* ——— NAV ——— */}
      <header className="mx-auto flex max-w-page items-center justify-between px-4 py-5">
        <p className="text-lg font-extrabold tracking-tight">RD&nbsp;Portage</p>
        <nav className="hidden gap-8 text-sm font-medium text-[#4A5061] md:flex">
          {[
            ["Simulateur", "/simulateur"],
            ["Méthode", "#methode"],
            ["Preuves", "#preuves"],
            ["Tarif", "#tarif"],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="relative transition-colors hover:text-[#0B0D12] after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-[#B08D57] after:transition-all after:duration-300 hover:after:w-full"
            >
              {label}
            </a>
          ))}
        </nav>
        <Pill href="tel:+33632988723">Diagnostic 30 min</Pill>
      </header>

      {/* ——— HERO ——— */}
      <section className="mx-auto max-w-page px-4 pb-16 pt-10 text-center md:pt-14">
        <Reveal from="down">
          {/* Locked promise, restyled — wording untouched. */}
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Vous payez{" "}
            <span className="relative inline-block">
              trop d&rsquo;impôts
              <Scribble />
            </span>{" "}
            sans le savoir.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-[#4A5061] md:text-lg">
            Calculez votre meilleur taux d&rsquo;imposition en 2 à 3 minutes. Gratuit, sans engagement. Portage salarial 100&nbsp;% légal,
            chaque euro tracé.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-5">
            <Pill dark>Calculer mon taux</Pill>
            <div className="flex items-center gap-3">
              <span className="flex">
                {TEAM_AVATARS.map((a, i) => (
                  <InitialsAvatar key={a.initials} initials={a.initials} bg={a.bg} className={i > 0 ? "-ml-2.5" : ""} />
                ))}
              </span>
              <p className="text-left text-xs font-semibold leading-tight text-[#4A5061]">
                ~30 consultants
                <br />
                portés depuis 2021
              </p>
            </div>
          </div>
        </Reveal>

        {/* Mockup cards: 3D phone + scenario bars (stacks on mobile). */}
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Reveal from="left">
            <PhoneCard />
          </Reveal>
          <Reveal from="right" delay={120} className="h-full">
            <ScenarioCard />
          </Reveal>
        </div>

        {/* Stat chips */}
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["4 %", "frais de gestion, tout compris"],
            [`${PCT} %`, "du CA restitué (cas de référence)"],
            ["2021", "création — RCS Versailles"],
            ["18 000 €", "d'avantages légaux possibles / an"],
          ].map(([big, small], i) => (
            <Reveal key={big} from="up" delay={i * 110}>
              <div className="rounded-2xl border border-[#ECEEF3] bg-white px-4 py-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                <p className="text-2xl font-extrabold tabular-nums">{big}</p>
                <p className="mt-1 text-xs font-medium text-[#7A8093]">{small}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ——— GSAP horizontal steps ——— */}
      <HorizontalSteps />

      {/* ——— EDITORIAL SPLIT ——— */}
      <section id="preuves" className="mx-auto max-w-page px-4 py-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <Reveal from="left">
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              Depuis 2024, un montage opaque se paie sur{" "}
              <span className="relative inline-block">
                votre
                <Scribble />
              </span>{" "}
              paie.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#4A5061]">
              En cas de redressement URSSAF, la régularisation s&rsquo;impute sur la rémunération du porté — jusqu&rsquo;à 3 ans en
              arrière. Cash en main, CPF détourné, facturation offshore : l&rsquo;avantage est immédiat, le risque est pour vous. Notre
              réponse : un cadre 100&nbsp;% légal où l&rsquo;optimisation vient des dispositifs officiels, pas des angles morts.
            </p>
            <div className="mt-6 flex items-center gap-4 rounded-2xl border border-[#ECEEF3] bg-white p-4 transition-all duration-200 hover:shadow-md">
              <Image src="/ridha.png" alt="Ridha Chammam" width={56} height={56} className="rounded-full" />
              <div>
                <p className="text-sm font-bold">« J&rsquo;ai moi-même été consultant porté. »</p>
                <p className="text-xs text-[#7A8093]">Ridha Chammam — fondateur de RD Portage, Founder &amp; CEO RIDCHA DATA</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                ["3 ans", "de rappel possible"],
                ["×4", "le coût d'un indu redressé"],
                ["0", "montage gris chez RD"],
              ].map(([b, s]) => (
                <div key={b} className="rounded-2xl px-4 py-3 transition-transform duration-200 hover:scale-[1.03]" style={{ backgroundColor: LILAC }}>
                  <p className="text-xl font-extrabold tabular-nums">{b}</p>
                  <p className="text-[11px] font-medium text-[#4A5061]">{s}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal from="right" delay={120}>
            <div className="space-y-4">
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl border-2 border-dashed border-[#C9CEDA] bg-[#F6F7FA] p-4 text-center">
                <p className="text-xs font-medium leading-relaxed text-[#7A8093]">
                  Image à fournir — photo d&rsquo;un consultant en situation de travail, lumineuse, cadrage 4:3
                </p>
              </div>
              <div className="rounded-3xl p-5" style={{ backgroundColor: MINT }}>
                <p className="text-sm font-bold" style={{ color: "#2F6B4F" }}>Garde-fous intégrés</p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: "#2F6B4F" }}>
                  Frais plafonnés à 30 % du CA, avantages dans les plafonds URSSAF, chaque chiffre du site sourcé ou retiré.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ——— TRUST + TESTIMONIALS ——— */}
      <section className="border-y border-[#ECEEF3] bg-[#FAFBFD]">
        <div className="mx-auto max-w-page px-4 py-14">
          <Reveal from="down">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-[#7A8093]">
              Ils font confiance à nos consultants
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              {TRUST_AVATARS.map((a, i) => (
                <Reveal key={a.initials} from="up" delay={i * 90}>
                  <InitialsAvatar initials={a.initials} bg={a.bg} size={52} className="shadow-sm transition-transform duration-200 hover:scale-110" />
                </Reveal>
              ))}
            </div>
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {[
              {
                quote:
                  "Le simulateur m'a donné le vrai chiffre, foyer compris — personne d'autre ne le calcule. Signature en 48 h, comme annoncé.",
                who: "K. B. — consultant data, ex-ESN (témoignage à recueillir)",
                initials: "KB",
                bg: PEACH,
                from: "left" as const,
              },
              {
                quote:
                  "Je viens d'un portage à 8 % sans aucune optimisation. La différence est exactement celle annoncée par la simulation.",
                who: "S. M. — consultante SAP (témoignage à recueillir)",
                initials: "SM",
                bg: LILAC,
                from: "right" as const,
              },
            ].map((t) => (
              <Reveal key={t.initials} from={t.from}>
                <figure className="h-full rounded-3xl border border-[#ECEEF3] bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <p className="text-sm font-bold text-[#B08D57]">★★★★★</p>
                  <blockquote className="mt-3 text-sm leading-relaxed text-[#4A5061]">« {t.quote} »</blockquote>
                  <figcaption className="mt-4 flex items-center gap-3">
                    <InitialsAvatar initials={t.initials} bg={t.bg} size={48} />
                    <p className="text-xs font-semibold">{t.who}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ——— PRICING / FINAL CTA — solo bottom block: rises from below. ——— */}
      <section id="tarif" className="mx-auto max-w-page px-4 py-16 text-center">
        <Reveal from="up">
          <div className="rounded-3xl px-6 py-12 md:py-16" style={{ backgroundColor: PEACH }}>
            <p className="text-xs font-bold uppercase tracking-widest text-[#8A6B3F]">Un seul tarif, tout compris</p>
            <p className="mt-3 text-5xl font-extrabold tabular-nums">4&nbsp;%</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#4A5061]">
              de frais de gestion. 400 € pour 10 000 € de CA porté — sans ligne cachée en bas de page.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-4">
              <Pill dark>Calculer mon taux — 2 à 3 min</Pill>
              <Pill href="tel:+33632988723">Appeler Ridha — 06 32 98 87 23</Pill>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ——— FOOTER ——— */}
      <footer className="border-t border-[#ECEEF3]">
        <div className="mx-auto max-w-page px-4 py-8 text-xs leading-relaxed text-[#7A8093]">
          <p>RD Portage — 1 rue George Stephenson, 78180 Montigny-le-Bretonneux · RCS Versailles 912 888 013 · +33 1 71 49 71 57</p>
          <p className="mt-1">
            <Link href="/mentions-legales" className="underline">Mentions légales</Link>
            {" · "}
            <Link href="/confidentialite" className="underline">Confidentialité</Link>
            {" · "}
            Simulation à valeur indicative — ne constitue pas un conseil fiscal personnalisé.
          </p>
        </div>
      </footer>
    </main>
  );
}
