"use client";

/**
 * CONCEPT C — light fintech variant, v3 (client feedback round 2):
 * - "Trois étapes" horizontal section rebuilt around a CONTINUOUS BRASS
 *   THREAD (same stroke as the scribble accent) that draws itself with the
 *   scroll and travels across the cards: 3 question circles converge into
 *   one line (30 s chip) → the line diverges through household waypoints
 *   (situation familiale, garde alternée, frais réels, PER) and reconverges
 *   → straight to Ridha's photo node, then a signature chip (48 h).
 *   Extra end-spacer so the 3rd card gets full dwell time before unpin.
 * - Hero phone rebuilt in crisp CSS 3D (tilt toward cursor, idle float),
 *   same height as the scenario card; slot-machine digits kept.
 * - Icons are temporary stand-ins for future generated illustrations.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
const BRASS = "#B08D57";

/* ————————————————————————— shared bits ————————————————————————— */

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
      <path d="M4 9 C 60 2, 150 2, 216 7" fill="none" stroke={BRASS} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/* tiny stroke icons — placeholders for future illustrations */
function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" />
    </svg>
  );
}
function IconPen() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M3 21c4-1 4-1 6-3L20 7l-3-3L6 15c-2 2-2 2-3 6Z" strokeLinejoin="round" />
      <path d="M14 6l3 3" />
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

function SlotValue({ value, run, baseDelay = 0 }: { value: string; run: boolean; baseDelay?: number }) {
  let digitIndex = 0;
  return (
    <span className="tabular-nums" style={{ lineHeight: 1 }}>
      {value.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <Digit key={i} d={Number(ch)} run={run} delay={baseDelay + digitIndex++ * 110} />
        ) : (
          <span key={i}>{ch === " " ? " " : ch}</span>
        ),
      )}
    </span>
  );
}

/* ————————————————— CSS-3D phone (hero) ————————————————— */

function PhoneCard() {
  const phone = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(false);

  useEffect(() => {
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
      className="flex h-full flex-col rounded-3xl p-5 md:p-6"
      style={{ backgroundColor: PEACH, perspective: "1100px" }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 2 - 1;
        const y = ((e.clientY - r.top) / r.height) * 2 - 1;
        if (phone.current) {
          phone.current.style.transition = "transform .1s linear";
          phone.current.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 8}deg)`;
        }
      }}
      onPointerLeave={() => {
        if (phone.current) {
          phone.current.style.transition = "transform .6s ease-out";
          phone.current.style.transform = "rotateY(0deg) rotateX(0deg)";
        }
      }}
    >
      <div className="flex flex-1 items-center justify-center py-4">
        <div
          ref={phone}
          className="relative w-[272px] rounded-[36px] p-2.5 shadow-2xl will-change-transform"
          style={{ backgroundColor: INK, transformStyle: "preserve-3d", animation: "phonefloat 7s ease-in-out infinite" }}
        >
          {/* notch */}
          <div className="absolute left-1/2 top-4 h-[10px] w-[88px] -translate-x-1/2 rounded-full bg-[#23262F]" />
          <div className="rounded-[28px] bg-white px-4 pb-4 pt-6">
            <div className="flex items-center justify-between text-[10px] font-bold text-[#7A8093]">
              <span>9:41</span>
              <span>Votre simulation</span>
            </div>
            <p className="mt-3 text-[11px] font-semibold text-[#7A8093]">Rémunération globale / mois</p>
            <p className="mt-1 text-[32px] font-extrabold">
              <SlotValue value={`${eur(REF.globalCompensation)} €`} run={run} />
            </p>
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
        </div>
      </div>
      <p className="text-xs font-semibold text-[#8A6B3F]">
        Cas de référence TJM 420 € — calculé par notre moteur, pas par le marketing.
      </p>
      <style jsx global>{`
        @keyframes phonefloat {
          0%, 100% { translate: 0 0; }
          50% { translate: 0 -8px; }
        }
      `}</style>
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
    ["RD Portage optimisé", PCT, BRASS],
  ];

  return (
    <div ref={wrap} className="flex h-full flex-col rounded-3xl p-6 text-left md:p-8" style={{ backgroundColor: LILAC }}>
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

/* ————————————————— the brass thread — horizontal steps ————————————————— */

/** Chip pinned on the thread (desktop: absolute %, mobile: inline). */
function ThreadChip({
  left,
  top,
  accent,
  icon,
  children,
}: {
  left: string;
  top: string;
  accent: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      className="step-anim z-20 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold shadow-md transition-transform duration-200 hover:scale-110 md:absolute md:-translate-x-1/2 md:-translate-y-1/2"
      style={{ left, top, color: accent }}
    >
      {icon}
      {children}
    </span>
  );
}

/** SVG path layer drawn over a card; paths get scroll-scrubbed dashoffset. */
function ThreadSvg({ paths }: { paths: string[] }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full md:block"
      viewBox="0 0 1000 600"
      preserveAspectRatio="none"
      aria-hidden
    >
      {paths.map((d) => (
        <path key={d} d={d} className="thread-path" fill="none" stroke={BRASS} strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

function StepShell({
  tint,
  accent,
  num,
  title,
  body,
  children,
}: {
  tint: string;
  accent: string;
  num: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative md:flex md:h-[70vh] md:items-center md:pr-[4vw]">
      <div
        className="step-panel group relative overflow-hidden rounded-3xl p-6 transition-shadow duration-300 hover:shadow-2xl md:h-[70vh] md:min-w-[52vw] md:p-10"
        style={{ backgroundColor: tint }}
      >
        <p
          className="step-anim pointer-events-none absolute -right-2 -top-8 z-0 select-none text-[30vw] font-extrabold leading-none md:-top-14 md:text-[13rem]"
          style={{ color: accent, opacity: 0.13 }}
        >
          {num}
        </p>
        <div className="relative z-20 max-w-md">
          <p className="step-anim text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>
            Étape {num}
          </p>
          <h3 className="step-anim mt-1.5 text-3xl font-extrabold tracking-tight md:text-5xl">{title}</h3>
          <p className="step-anim mt-3 text-sm leading-relaxed text-[#4A5061]">{body}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

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
          // 1.35x distance = slower travel + dwell time on the last card.
          end: () => `+=${dist() * 1.35}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // The thread draws itself as each card crosses the viewport.
      gsap.utils.toArray<SVGPathElement>(".thread-path").forEach((path) => {
        const len = path.getTotalLength();
        gsap.fromTo(
          path,
          { strokeDasharray: len, strokeDashoffset: len },
          {
            strokeDashoffset: 0,
            ease: "none",
            scrollTrigger: { trigger: path.closest(".step-panel"), containerAnimation: tween, start: "left 90%", end: "center 55%", scrub: true },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>(".step-panel").forEach((panel) => {
        gsap.fromTo(
          panel.querySelectorAll(".step-anim"),
          { y: 60, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.09,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: { trigger: panel, containerAnimation: tween, start: "left 80%" },
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
        className="flex flex-col gap-6 px-4 py-16 md:h-screen md:flex-row md:flex-nowrap md:items-center md:gap-0 md:py-0 md:pl-[7vw]"
      >
        {/* Intro panel — the thread starts under the scribble. */}
        <div className="relative md:flex md:h-[70vh] md:min-w-[30vw] md:items-center md:pr-[4vw]">
          <Reveal from="up">
            <p className="text-xs font-bold uppercase tracking-widest text-[#B08D57]">La méthode</p>
            <h2 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              Trois étapes,
              <br />
              <span className="relative inline-block">
                zéro zone grise
                <Scribble />
              </span>
            </h2>
            <p className="mt-4 hidden items-center gap-2 text-sm font-semibold text-[#7A8093] md:flex">
              Suivez le fil
              <svg width="28" height="12" viewBox="0 0 28 12" aria-hidden>
                <path d="M0 6h24m0 0-5-5m5 5-5 5" stroke={BRASS} strokeWidth="2" fill="none" />
              </svg>
            </p>
          </Reveal>
        </div>

        {/* ——— Étape 1 : 3 questions → convergence → 30 s ——— */}
        <StepShell tint={PEACH} accent="#8A6B3F" num="01" title="Diagnostic flash" body="Trois questions, une fourchette immédiate — sans email.">
          <ThreadSvg
            paths={[
              // three entry lines to the question circles
              "M 0 240 H 200",
              "M 0 330 H 200",
              "M 0 420 H 200",
              // convergence into the 30s node
              "M 255 240 C 400 240, 470 330, 580 330",
              "M 255 330 H 580",
              "M 255 420 C 400 420, 470 330, 580 330",
              // exit
              "M 730 330 H 1000",
            ]}
          />
          {/* question circles + chips — mobile: simple wrapped row */}
          <div className="relative z-20 mt-6 flex flex-wrap items-center gap-3 md:static md:mt-0 md:block">
            {[
              ["Statut ?", "20%", "40%"],
              ["TJM ?", "20%", "55%"],
              ["Foyer ?", "20%", "70%"],
            ].map(([label, left, top]) => (
              <span
                key={label}
                className="step-anim z-20 flex items-center gap-2 md:absolute md:-translate-x-1/2 md:-translate-y-1/2"
                style={{ left, top }}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg font-extrabold shadow-md" style={{ color: "#8A6B3F" }}>
                  ?
                </span>
                <span className="text-[11px] font-bold text-[#8A6B3F]">{label}</span>
              </span>
            ))}
            <ThreadChip left="65.5%" top="55%" accent="#8A6B3F" icon={<IconClock />}>
              30 secondes
            </ThreadChip>
          </div>
        </StepShell>

        {/* ——— Étape 2 : le fil diverge à travers les balises du foyer ——— */}
        <StepShell tint={LILAC} accent="#4A4F8C" num="02" title="Simulateur foyer" body="Le fil passe par tout ce que les autres ignorent — plafonds légaux inclus.">
          <ThreadSvg
            paths={[
              "M 0 330 H 100",
              // diverge
              "M 100 330 C 180 330, 200 230, 290 230",
              "M 100 330 C 180 330, 200 440, 290 440",
              // top branch through 2 waypoints
              "M 290 230 H 700",
              // bottom branch through 2 waypoints
              "M 290 440 H 700",
              // reconverge
              "M 700 230 C 800 230, 820 330, 890 330",
              "M 700 440 C 800 440, 820 330, 890 330",
              "M 890 330 H 1000",
            ]}
          />
          <div className="relative z-20 mt-6 flex flex-wrap items-center gap-2 md:static md:mt-0 md:block">
            <ThreadChip left="36%" top="38.3%" accent="#4A4F8C">Situation familiale</ThreadChip>
            <ThreadChip left="58%" top="38.3%" accent="#4A4F8C">Garde alternée</ThreadChip>
            <ThreadChip left="36%" top="73.3%" accent="#4A4F8C">Frais réels</ThreadChip>
            <ThreadChip left="58%" top="73.3%" accent="#4A4F8C">PER plafonné</ThreadChip>
            <ThreadChip left="74%" top="55%" accent="#4A4F8C" icon={<IconClock />}>2-3 min</ThreadChip>
          </div>
        </StepShell>

        {/* ——— Étape 3 : le fil passe par Ridha puis la signature ——— */}
        <StepShell tint={MINT} accent="#2F6B4F" num="03" title="Diagnostic 30 min" body="Vous validez votre chiffre avec le fondateur — proposition ferme à la clé.">
          <ThreadSvg
            paths={[
              "M 0 330 H 300",
              "M 420 330 H 600",
              "M 760 330 H 930",
            ]}
          />
          <div className="relative z-20 mt-6 flex flex-wrap items-center gap-3 md:static md:mt-0 md:block">
            {/* Ridha node — the human waypoint. */}
            <span className="step-anim z-20 flex flex-col items-center gap-1.5 md:absolute md:left-[36%] md:top-[55%] md:-translate-x-1/2 md:-translate-y-1/2">
              <Image src="/ridha.png" alt="Ridha Chammam" width={76} height={76} className="rounded-full shadow-lg ring-4 ring-white" />
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold shadow-md" style={{ color: "#2F6B4F" }}>
                30 min avec Ridha
              </span>
            </span>
            <ThreadChip left="68%" top="55%" accent="#2F6B4F" icon={<IconPen />}>
              Signature sous 48 h
            </ThreadChip>
            {/* end dot */}
            <span className="step-anim z-20 hidden h-3.5 w-3.5 rounded-full md:absolute md:left-[94%] md:top-[55%] md:block md:-translate-x-1/2 md:-translate-y-1/2" style={{ backgroundColor: BRASS }} />
          </div>
        </StepShell>

        {/* End spacer — dwell room so card 3 settles before the unpin. */}
        <div className="hidden md:block md:min-w-[16vw]" />
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
            <span className="font-bold text-[#B08D57]">Prototype interne</span> — Concept C, variante UI fintech claire (v3 : fil doré)
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

        {/* Mockup cards — equal heights via items-stretch. */}
        <div className="mt-12 grid items-stretch gap-6 md:grid-cols-2">
          <Reveal from="left" className="h-full">
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

      {/* ——— GSAP horizontal steps with the brass thread ——— */}
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

      {/* ——— PRICING / FINAL CTA ——— */}
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
