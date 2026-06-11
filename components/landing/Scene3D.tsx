"use client";

/**
 * Three.js transparency story — three mechanisms side by side:
 * 1. SALARIAT: opaque night-blue box (money in, net out, inside invisible).
 * 2. FREELANCE/SASU: tangled brass gears, some jammed.
 * 3. PORTAGE RD: a single transparent gear with a golden flow through it.
 * Procedural geometry only, sober physical materials, no skybox, no heavy
 * downloaded models. Target 60fps; the parent gates WebGL/reduced-motion.
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh } from "three";

const NUIT = "#0E1B33";
const LAITON = "#B08D57";
const CREME = "#F4EFE6";

function Gear({
  position,
  radius = 0.8,
  teeth = 9,
  thickness = 0.25,
  speed = 0.4,
  jammed = false,
  transparent = false,
}: {
  position: [number, number, number];
  radius?: number;
  teeth?: number;
  thickness?: number;
  speed?: number;
  jammed?: boolean;
  transparent?: boolean;
}) {
  const group = useRef<Group>(null);
  useFrame((state, delta) => {
    if (!group.current) return;
    if (jammed) {
      // Gripped gear: shudders instead of turning.
      group.current.rotation.z += Math.sin(state.clock.elapsedTime * 12) * 0.0015;
    } else {
      group.current.rotation.z += delta * speed;
    }
  });

  const material = transparent ? (
    <meshPhysicalMaterial
      color={CREME}
      metalness={0}
      roughness={0.15}
      transmission={0.85}
      thickness={0.5}
      transparent
      opacity={0.9}
    />
  ) : (
    <meshStandardMaterial color={jammed ? NUIT : LAITON} metalness={0.7} roughness={0.35} />
  );

  return (
    <group ref={group} position={position}>
      <mesh>
        <cylinderGeometry args={[radius, radius, thickness, 32]} />
        {material}
      </mesh>
      {Array.from({ length: teeth }).map((_, i) => {
        const angle = (i / teeth) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * (radius + 0.12), Math.sin(angle) * (radius + 0.12), 0]}
            rotation={[0, 0, angle]}
          >
            <boxGeometry args={[0.24, 0.16, thickness]} />
            {material}
          </mesh>
        );
      })}
      <mesh>
        <cylinderGeometry args={[0.12, 0.12, thickness * 1.6, 16]} />
        <meshStandardMaterial color={LAITON} metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

/** Golden euro-flow crossing the transparent gear. */
function Flow({ x }: { x: number }) {
  const particles = useRef<Mesh[]>([]);
  useFrame((state) => {
    particles.current.forEach((p, i) => {
      if (!p) return;
      const t = (state.clock.elapsedTime * 0.5 + i / 8) % 1;
      p.position.x = x - 1.6 + t * 3.2;
      p.position.y = Math.sin(t * Math.PI) * 0.15;
      const scale = 0.5 + Math.sin(t * Math.PI) * 0.5;
      p.scale.setScalar(scale);
    });
  });
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) particles.current[i] = el;
          }}
          position={[x, 0, 0.4]}
        >
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial color={LAITON} emissive={LAITON} emissiveIntensity={1.4} />
        </mesh>
      ))}
    </>
  );
}

function OpaqueBox() {
  const box = useRef<Group>(null);
  useFrame((state) => {
    if (box.current) box.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.15;
  });
  return (
    <group ref={box} position={[-3.4, 0, 0]}>
      <mesh>
        <boxGeometry args={[1.7, 1.7, 1.7]} />
        <meshStandardMaterial color={NUIT} metalness={0.2} roughness={0.7} />
      </mesh>
      {/* Thin brass seams, letterhead style. */}
      <mesh>
        <boxGeometry args={[1.72, 1.72, 1.72]} />
        <meshStandardMaterial color={LAITON} wireframe transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

export default function Scene3D() {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 5]} intensity={1.1} color={CREME} />
      <pointLight position={[3.4, 1, 2]} intensity={0.8} color={LAITON} />

      {/* 1. Salariat — opaque box. */}
      <OpaqueBox />

      {/* 2. Freelance/SASU — tangle of gears, two jammed. */}
      <group position={[-0.2, 0, 0]}>
        <Gear position={[0, 0.55, 0]} radius={0.55} teeth={8} speed={0.5} />
        <Gear position={[0.95, -0.25, 0]} radius={0.4} teeth={7} jammed />
        <Gear position={[-0.75, -0.5, 0]} radius={0.45} teeth={7} speed={-0.6} />
        <Gear position={[0.15, -0.95, 0.1]} radius={0.3} teeth={6} jammed />
      </group>

      {/* 3. Portage RD — one transparent gear, golden flow through. */}
      <Gear position={[3.2, 0, 0]} radius={1} teeth={11} speed={0.25} transparent />
      <Flow x={3.2} />
    </Canvas>
  );
}
