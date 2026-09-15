"use client";

/**
 * Lightweight motion primitives (no animation library — pure CSS transitions +
 * IntersectionObserver, so zero runtime cost and no bundle weight).
 * Follows Emil Kowalski's design-eng rules: strong ease-out, enter from
 * scale(~0.98)+opacity (never 0), reduced-motion always respected.
 * The CSS these rely on lives in LandingC's global <style> (.reveal/.spotcard).
 */
import { useEffect, useRef, useState } from "react";

/** Blur-fade-up when scrolled into view. `delayMs` staggers siblings. */
export function Reveal({
  children,
  delayMs = 0,
  className = "",
}: {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      data-shown={shown}
      style={{ "--reveal-delay": `${delayMs}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/** Card with a cursor-following brass border/glow (a "magic card"). Pure CSS;
 *  the pointer only writes two CSS vars, so it's cheap and reduced-motion safe
 *  (the glow is disabled under reduced-motion via the global stylesheet). */
export function SpotCard({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    e.currentTarget.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  return (
    <div className={`spotcard ${className}`} onPointerMove={onMove} style={style}>
      {children}
    </div>
  );
}
