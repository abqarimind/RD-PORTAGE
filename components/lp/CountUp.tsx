"use client";

/**
 * Count-up number animation — the landing's signature animation on the gain
 * figure. Animates from the previously displayed value to the new one with
 * requestAnimationFrame (text content only, no layout thrash). Snaps to the
 * final value when the user prefers reduced motion.
 */
import { useEffect, useRef, useState } from "react";

export function CountUp({
  value,
  durationMs = 1400,
  format = (n: number) => Math.round(n).toLocaleString("fr-FR"),
  className,
}: {
  value: number;
  durationMs?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
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
