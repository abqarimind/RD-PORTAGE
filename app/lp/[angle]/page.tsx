import type { Metadata } from "next";
import { LandingC, type Angle, type LandingVariant } from "@/components/lp/LandingC";

/**
 * Paid landing page, one route per ad angle (message match pub → page):
 *   /lp/a — Warning · /lp/b — Vrai net (défaut) · /lp/c — Fondateur
 * Same page body; only the above-the-fold hero changes.
 *
 * Layout variant via ?v=vsl (video) — default "flash" (diagnostic form).
 * No navigation by default (paid traffic). Append ?nav=1 for an internal
 * preview with the full site nav. Noindex — these are ad destinations.
 */
const ANGLES: Angle[] = ["a", "b", "c"];

export function generateStaticParams() {
  return ANGLES.map((angle) => ({ angle }));
}

export const dynamicParams = true;

export const metadata: Metadata = {
  title: "RD Portage — Calculez votre vrai taux d'imposition",
  robots: { index: false, follow: false },
};

export default function LpAnglePage({
  params,
  searchParams,
}: {
  params: { angle: string };
  searchParams?: { nav?: string; v?: string };
}) {
  // Unknown angle falls back to B (the default "vrai net" promise).
  const angle: Angle = (ANGLES as string[]).includes(params.angle) ? (params.angle as Angle) : "b";
  const showNav = searchParams?.nav === "1";
  const variant: LandingVariant = searchParams?.v === "vsl" ? "vsl" : "flash";
  return <LandingC angle={angle} showNav={showNav} variant={variant} />;
}
