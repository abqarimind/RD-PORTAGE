"use client";

/**
 * Accent visuel du dossier — Three.js, volontairement discret.
 *
 * Il est chargé à la demande et JAMAIS bloquant : c'est précisément une
 * génération client trop lourde qui faisait échouer l'ancien bouton de
 * téléchargement sur Safari iOS (BUG-06). Ici, si WebGL est indisponible, si
 * l'appareil est modeste, ou si l'utilisateur demande moins d'animations, le
 * dossier s'affiche intégralement sans lui — rien n'est perdu.
 */
import { useEffect, useRef, useState } from "react";

export function HeroAccent() {
  const mount = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    // Sur très petit écran, l'accent n'apporte rien et coûte de la batterie.
    if (window.innerWidth < 640) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        // Vérifie WebGL AVANT de charger three : pas de téléchargement inutile.
        const probe = document.createElement("canvas");
        const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
        if (!gl) return;

        const THREE = await import("three");
        if (disposed) return;

        const width = el.clientWidth;
        const height = el.clientHeight;
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        el.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 0, 6);

        // Un tore fin, en laiton : le « fil doré » de la charte, en volume.
        const geometry = new THREE.TorusGeometry(1.7, 0.035, 16, 160);
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color("#B08D57"),
          metalness: 0.85,
          roughness: 0.28,
        });
        const torus = new THREE.Mesh(geometry, material);
        torus.rotation.x = Math.PI / 3;
        scene.add(torus);

        scene.add(new THREE.AmbientLight(0xffffff, 1.1));
        const key = new THREE.DirectionalLight(0xffffff, 1.6);
        key.position.set(3, 4, 5);
        scene.add(key);

        setActive(true);

        let raf = 0;
        let running = true;
        const loop = () => {
          if (!running) return;
          torus.rotation.z += 0.0022;
          torus.rotation.y += 0.0011;
          renderer.render(scene, camera);
          raf = requestAnimationFrame(loop);
        };
        loop();

        // Met l'animation en pause hors écran et en arrière-plan d'onglet.
        const io = new IntersectionObserver(([entry]) => {
          running = entry.isIntersecting && !document.hidden;
          if (running) loop();
          else cancelAnimationFrame(raf);
        });
        io.observe(el);

        const onResize = () => {
          const w = el.clientWidth;
          const h = el.clientHeight;
          renderer.setSize(w, h);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        window.addEventListener("resize", onResize);

        cleanup = () => {
          running = false;
          cancelAnimationFrame(raf);
          io.disconnect();
          window.removeEventListener("resize", onResize);
          geometry.dispose();
          material.dispose();
          renderer.dispose();
          el.removeChild(renderer.domElement);
        };
      } catch (err) {
        // Un accent décoratif ne casse jamais la page.
        console.warn("[dossier] accent 3D indisponible", err);
      }
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <div
      ref={mount}
      aria-hidden="true"
      className="pointer-events-none absolute right-0 top-0 hidden h-56 w-56 sm:block"
      style={{ opacity: active ? 1 : 0, transition: "opacity 600ms ease" }}
    />
  );
}
