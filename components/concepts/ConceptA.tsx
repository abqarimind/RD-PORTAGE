"use client";

/**
 * CONCEPT A — « L'instruction du dossier ».
 * One pinned full-viewport 3D scene; scrolling drives the whole narrative
 * (camera/stage moves, objects morph). A golden euro travels through three
 * mechanisms: opaque box (salariat) → jammed gear tangle (SASU) → glass gear
 * (portage RD). Beat 4: URSSAF stamp slams, only the glass gear survives.
 * Beat 5: the yearly figure counts up → CTA.
 *
 * Scroll progress lives in a ref (no re-render per frame); only the active
 * beat index goes through React state for the DOM overlay.
 */
import { Canvas, useFrame } from "@react-three/fiber";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Group, Mesh, PointLight } from "three";
import { MathUtils } from "three";
import { computePortage } from "@/lib/fiscal/portage";

const NUIT = "#0E1B33";
const LAITON = "#B08D57";
const CREME = "#F4EFE6";

/** Timeline segments (fractions of total scroll). */
const BEATS = [
  { start: 0.0, end: 0.14 }, // 0 — the euro, alone
  { start: 0.14, end: 0.32 }, // 1 — opaque box
  { start: 0.32, end: 0.54 }, // 2 — gear tangle
  { start: 0.54, end: 0.74 }, // 3 — glass gear
  { start: 0.74, end: 0.9 }, // 4 — URSSAF stamp
  { start: 0.9, end: 1.0 }, // 5 — the figure
];

const seg = (p: number, i: number) =>
  MathUtils.clamp((p - BEATS[i].start) / (BEATS[i].end - BEATS[i].start), 0, 1);
const ease = (t: number) => t * t * (3 - 2 * t);

/* Reference case computed by the real engine — same maths as the simulator. */
const REF = computePortage({ tjm: 420, days: 20, ndf: 500, cagnotteMay: 1570, mealVouchers: true });
const REF_RAW = computePortage({ tjm: 420, days: 20 });
const YEARLY_GAP = Math.round((REF.globalCompensation - REF_RAW.netSalary) * 12);

/* Stage x-anchors per mechanism. */
const X_BOX = 0;
const X_TANGLE = 7;
const X_GLASS = 14;

function Gear({
  position,
  radius = 0.7,
  teeth = 9,
  thickness = 0.24,
  color = LAITON,
  glass = false,
  gearRef,
}: {
  position: [number, number, number];
  radius?: number;
  teeth?: number;
  thickness?: number;
  color?: string;
  glass?: boolean;
  gearRef?: React.MutableRefObject<Group | null>;
}) {
  const material = glass ? (
    <meshPhysicalMaterial color={CREME} metalness={0} roughness={0.12} transmission={0.85} thickness={0.5} transparent opacity={0.92} />
  ) : (
    <meshStandardMaterial color={color} metalness={0.7} roughness={0.35} />
  );
  return (
    <group ref={gearRef} position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius, radius, thickness, 32]} />
        {material}
      </mesh>
      {Array.from({ length: teeth }).map((_, i) => {
        const a = (i / teeth) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * (radius + 0.11), Math.sin(a) * (radius + 0.11), 0]} rotation={[0, 0, a]}>
            <boxGeometry args={[0.22, 0.15, thickness]} />
            {material}
          </mesh>
        );
      })}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, thickness * 1.7, 16]} />
        <meshStandardMaterial color={LAITON} metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Scene({ progress }: { progress: React.MutableRefObject<number> }) {
  const stage = useRef<Group>(null);
  const euro = useRef<Group>(null);
  const box = useRef<Group>(null);
  const boxCracks = useRef<Mesh>(null);
  const tangle = useRef<Group>(null);
  const tangleGears = useRef<(Group | null)[]>([]);
  const fallingBits = useRef<(Mesh | null)[]>([]);
  const glass = useRef<Group>(null);
  const flow = useRef<(Mesh | null)[]>([]);
  const key = useRef<PointLight>(null);

  useFrame((state, delta) => {
    const p = progress.current;
    const t = state.clock.elapsedTime;
    const s0 = seg(p, 0), s1 = seg(p, 1), s2 = seg(p, 2), s3 = seg(p, 3), s4 = seg(p, 4), s5 = seg(p, 5);

    // Stage slides left so the camera "travels" box → tangle → glass.
    const stageX = -(X_BOX + (X_TANGLE - X_BOX) * ease(s2) + (X_GLASS - X_TANGLE) * ease(s3));
    if (stage.current) stage.current.position.x = stageX;

    // Light: dims hard during the control beat, recovers for the finale.
    if (key.current) key.current.intensity = 1.1 - 0.85 * ease(s4) * (1 - s5) ;

    // ——— Euro: falls in (beat 0), enters box, re-emerges smaller, then
    // rides across scenes and multiplies into the flow at the glass gear.
    if (euro.current) {
      const fallY = MathUtils.lerp(4.5, 0, ease(s0));
      const intoBox = ease(s1);
      euro.current.position.y = fallY - Math.sin(intoBox * Math.PI) * 0.2;
      euro.current.position.x =
        MathUtils.lerp(-3.2, X_BOX, ease(s0)) +
        (X_TANGLE - X_BOX) * ease(s2) +
        (X_GLASS - X_TANGLE) * ease(s3);
      const swallowed = s1 > 0.35 && s1 < 0.75 ? 0 : 1; // hidden inside the opaque box
      euro.current.scale.setScalar(0.001 + swallowed * (1 - 0.35 * (s1 >= 0.75 ? 1 : 0) * (1 - s3)));
      euro.current.rotation.y = t * 1.2;
    }

    // ——— Beat 1: the opaque box closes around the euro.
    if (box.current) {
      const grow = ease(Math.min(s1 * 1.6, 1));
      box.current.scale.setScalar(0.001 + grow * (1 - 0.9 * ease(s2))); // shrinks away on beat 2
      box.current.rotation.y = 0.25 * Math.sin(t * 0.4);
    }
    if (boxCracks.current) {
      (boxCracks.current.material as { opacity: number }).opacity = 0.25 + 0.75 * ease(s4);
    }

    // ——— Beat 2: the tangle assembles; two gears jam; pieces fall.
    tangleGears.current.forEach((g, i) => {
      if (!g) return;
      const local = ease(MathUtils.clamp(s2 * 2.2 - i * 0.18, 0, 1));
      g.scale.setScalar(0.001 + local);
      const jammed = i === 1 || i === 3;
      if (jammed && s2 > 0.5) {
        g.rotation.z += Math.sin(t * 14) * 0.002; // shudder
        g.rotation.x = MathUtils.lerp(g.rotation.x, 0.18, 0.02); // tilts off-axis
      } else {
        g.rotation.z += delta * (i % 2 ? -0.5 : 0.5);
      }
    });
    fallingBits.current.forEach((b, i) => {
      if (!b) return;
      const drop = ease(MathUtils.clamp(s2 * 1.6 - 0.4 - i * 0.12, 0, 1)) + ease(s4); // more fall at the control
      b.position.y = 0.4 - drop * 4.2;
      b.rotation.x = drop * 5;
      (b.material as { opacity: number }).opacity = drop > 0 ? 1 - drop * 0.7 : 0;
    });
    if (tangle.current) tangle.current.scale.setScalar(1 - 0.25 * ease(s4)); // sags under control

    // ——— Beat 3: glass gear assembles and turns, flow crosses it.
    if (glass.current) {
      const grow = ease(Math.min(s3 * 1.8, 1));
      glass.current.scale.setScalar(0.001 + grow * (1 + 0.06 * ease(s4))); // unshaken, even glows at control
      glass.current.rotation.z += delta * 0.25;
    }
    flow.current.forEach((m, i) => {
      if (!m) return;
      const active = s3 > 0.3 ? 1 : 0;
      const u = (t * 0.45 + i / 9) % 1;
      m.position.x = X_GLASS - 2.2 + u * 4.4;
      m.position.y = Math.sin(u * Math.PI) * 0.18;
      m.scale.setScalar(active * (0.4 + Math.sin(u * Math.PI) * 0.6));
    });
  });

  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 6, 5]} intensity={0.9} color={CREME} />
      <pointLight ref={key} position={[2, 2, 4]} intensity={1.1} color={LAITON} />

      <group ref={stage}>
        {/* The euro — a golden coin. */}
        <group ref={euro}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.28, 0.28, 0.07, 32]} />
            <meshStandardMaterial color={LAITON} emissive={LAITON} emissiveIntensity={0.9} metalness={0.9} roughness={0.2} />
          </mesh>
        </group>

        {/* 1 — Salariat: the opaque box. */}
        <group position={[X_BOX, 0, 0]}>
          <group ref={box}>
            <mesh>
              <boxGeometry args={[2, 2, 2]} />
              <meshStandardMaterial color={NUIT} metalness={0.2} roughness={0.75} />
            </mesh>
            <mesh ref={boxCracks}>
              <boxGeometry args={[2.02, 2.02, 2.02]} />
              <meshStandardMaterial color={LAITON} wireframe transparent opacity={0.25} />
            </mesh>
          </group>
        </group>

        {/* 2 — SASU: the tangle. */}
        <group ref={tangle} position={[X_TANGLE, 0, 0]}>
          {[
            [0, 0.7, 0, 0.62, 9],
            [1.05, -0.15, 0.1, 0.45, 7],
            [-0.95, -0.45, -0.1, 0.5, 8],
            [0.15, -1.05, 0.2, 0.34, 6],
            [-0.2, 0, 0.35, 0.28, 6],
          ].map(([x, y, z, r, teeth], i) => (
            <Gear
              key={i}
              position={[x as number, y as number, z as number]}
              radius={r as number}
              teeth={teeth as number}
              color={i === 1 || i === 3 ? NUIT : LAITON}
              gearRef={{
                get current() { return tangleGears.current[i] ?? null; },
                set current(v) { tangleGears.current[i] = v; },
              } as React.MutableRefObject<Group | null>}
            />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh
              key={`bit-${i}`}
              ref={(el) => { fallingBits.current[i] = el; }}
              position={[(i - 2.5) * 0.4, 0.4, 0.3]}
            >
              <boxGeometry args={[0.14, 0.1, 0.08]} />
              <meshStandardMaterial color={LAITON} transparent opacity={0} metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
        </group>

        {/* 3 — Portage RD: the glass gear + golden flow. */}
        <group position={[X_GLASS, 0, 0]}>
          <Gear position={[0, 0, 0]} radius={1.05} teeth={12} glass gearRef={glass} />
        </group>
        {Array.from({ length: 9 }).map((_, i) => (
          <mesh key={`flow-${i}`} ref={(el) => { flow.current[i] = el; }} position={[X_GLASS, 0, 0.5]} scale={0}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color={LAITON} emissive={LAITON} emissiveIntensity={1.6} />
          </mesh>
        ))}
      </group>
    </>
  );
}

/* ——— Overlay copy per beat (the text IS the plea; 3D illustrates it). ——— */
const BEAT_COPY = [
  {
    kicker: "Pièce n° 1",
    title: "Voici un euro. Le vôtre.",
    body: "Facturé à votre client, gagné par votre travail. Suivez-le : trois mécanismes peuvent le traiter, un seul vous laisse tout voir.",
  },
  {
    kicker: "Mécanisme 1 — Salariat",
    title: "La boîte opaque",
    body: "Votre euro entre. Un net ressort, amoindri. Entre les deux : marges, charges, refacturation — invisible par construction. Vous ne saurez jamais ce que vous valez vraiment.",
  },
  {
    kicker: "Mécanisme 2 — Freelance / SASU",
    title: "Le mécanisme enchevêtré",
    body: "Tout est à vous — et tout est à votre charge. URSSAF, TVA, comptable, juridique : chaque rouage se paie, certains grippent, et des pièces tombent. En pénalités, ou en soirées perdues.",
  },
  {
    kicker: "Mécanisme 3 — Portage RD",
    title: "Le rouage de verre",
    body: "Chaque euro visible de l'entrée à la sortie : 4 % de gestion, charges affichées, frais remboursés, avantages tracés. La transparence n'est pas un argument marketing — c'est l'architecture.",
  },
  {
    kicker: "Pièce n° 2 — Le contrôle",
    title: "Le jour où l'URSSAF frappe",
    body: "Les montages opaques se fissurent : la régularisation s'impute sur votre paie, jusqu'à 3 ans en arrière. Le rouage de verre, lui, n'a rien à cacher — c'est précisément sa force.",
  },
  {
    kicker: "Verdict",
    title: "", // replaced by the live counter
    body: "Écart annuel calculé par notre moteur fiscal sur le cas de référence TJM 420 € (20 j/mois, optimisations légales plafonnées) entre un portage nu et RD Portage optimisé.",
  },
];

export function ConceptA() {
  const progress = useRef(0);
  const [beat, setBeat] = useState(0);
  const [counter, setCounter] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = document.createElement("canvas");
    const webgl = !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    setEnabled(!reduced && webgl);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = wrap.current;
        if (!el) return;
        const total = el.offsetHeight - window.innerHeight;
        const p = MathUtils.clamp(-el.getBoundingClientRect().top / total, 0, 1);
        progress.current = p;
        const idx = BEATS.findIndex((b) => p >= b.start && p < b.end);
        setBeat(idx === -1 ? 5 : idx);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  // Counter counts up while beat 5 is active.
  useEffect(() => {
    if (beat !== 5) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / 1400, 1);
      setCounter(Math.round(YEARLY_GAP * ease(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [beat]);

  if (enabled === false) {
    return (
      <div className="bg-nuit px-4 py-24 text-center text-creme">
        <p className="display text-2xl">Version animée indisponible sur cet appareil.</p>
        <p className="mt-3 text-creme/80">
          Découvrez la même histoire en version 2D : <Link href="/concept-b" className="underline text-laiton">le billet de 100 €</Link>.
        </p>
      </div>
    );
  }

  const copy = BEAT_COPY[beat];

  return (
    <div ref={wrap} className="relative bg-nuit" style={{ height: "650vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        {enabled && (
          <Canvas camera={{ position: [0, 0, 6.5], fov: 45 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
            <Scene progress={progress} />
          </Canvas>
        )}

        {/* Progress rail — the case file's tabs. */}
        <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col gap-2 md:flex">
          {BEAT_COPY.map((_, i) => (
            <div key={i} className={`h-8 w-px transition ${i <= beat ? "bg-laiton" : "bg-creme/20"}`} />
          ))}
        </div>

        {/* URSSAF stamp — DOM, slams on beat 4. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 transition-all duration-200 ease-out"
          style={{
            opacity: beat === 4 ? 1 : 0,
            transform: `translateX(-50%) rotate(-8deg) scale(${beat === 4 ? 1 : 2.6})`,
          }}
        >
          <p className="border-4 border-laiton px-6 py-2 font-sans text-2xl font-medium uppercase tracking-widest text-laiton md:text-4xl">
            Contrôle URSSAF
          </p>
        </div>

        {/* Narrative panel. */}
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-12">
          <div key={beat} className="mx-auto max-w-page animate-[fadeup_.45s_ease-out]">
            <p className="text-xs uppercase tracking-widest text-laiton">{copy.kicker}</p>
            {beat === 5 ? (
              <p className="display mt-2 text-3xl leading-tight text-creme md:text-5xl">
                Vous laissez{" "}
                {/* Lighter validation green for contrast on night blue. */}
                <span className="tnum" style={{ color: "#7FBF9E" }}>
                  {counter.toLocaleString("fr-FR")} €
                </span>{" "}
                par an sur la table.
              </p>
            ) : (
              <h2 className="display mt-2 max-w-2xl text-2xl leading-tight text-creme md:text-4xl">{copy.title}</h2>
            )}
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-creme/85 md:text-base">{copy.body}</p>
            {beat === 5 && (
              <Link href="/simulateur" className="cta-primary mt-5">
                Calculer mon chiffre exact — 2 à 3 minutes
              </Link>
            )}
          </div>
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
