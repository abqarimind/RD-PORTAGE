"use client";

/**
 * Count-up number animation — the landing's signature animation on the gain
 * figure. Animates from the previously displayed value to the new one with
 * requestAnimationFrame (text content only, no layout thrash). Snaps to the
 * final value when the user prefers reduced motion.
 *
 * Le rendu serveur affiche la VALEUR FINALE (14/10) : le « 4 % » des frais
 * s'affichait « 0 % » tant que le JavaScript n'avait pas tourné, et c'est ce
 * que voyaient les aperçus de lien et les connexions lentes. L'animation ne
 * part donc que sur un changement de valeur, ou au montage quand
 * `animateOnMount` le demande (chiffre qui apparaît après une action).
 */
import { useEffect, useRef, useState } from "react";
import { groupFr } from "@/lib/format";

export function CountUp({
  value,
  durationMs = 1400,
  format = (n: number) => groupFr(n),
  className,
  animateOnMount = false,
}: {
  value: number;
  durationMs?: number;
  format?: (n: number) => string;
  className?: string;
  animateOnMount?: boolean;
}) {
  const [display, setDisplay] = useState(animateOnMount ? 0 : value);
  const fromRef = useRef(animateOnMount ? 0 : value);

  useEffect(() => {
    if (fromRef.current === value) return;
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const current = from + (value - from) * eased;
      setDisplay(current);
      fromRef.current = current;
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return (
    <span className={className} aria-label={format(value)}>
      {format(display)}
    </span>
  );
}
