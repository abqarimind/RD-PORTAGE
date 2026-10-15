import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findHeadline, HEADLINES } from "@/config/headlines";
import { Landing } from "@/components/landing/Landing";

/**
 * Variantes de l'accueil, une par promesse de pub (config/headlines.ts).
 * Jamais visitées directement : le middleware y réécrit « / » et /lp/* selon
 * `utm_content`, l'adresse affichée restant celle de la pub. Pages
 * statiques, servies depuis le CDN. Non indexées : ce sont des destinations
 * d'annonces.
 */
export function generateStaticParams() {
  return HEADLINES.map((h) => ({ variant: h.key }));
}

export const dynamicParams = false;

export const metadata: Metadata = {
  title: "RD Portage — Calcule ton vrai net et ton vrai taux",
  robots: { index: false, follow: false },
};

export default function VariantPage({ params }: { params: { variant: string } }) {
  const headline = findHeadline(params.variant);
  if (!headline) notFound();
  return <Landing headline={headline} />;
}
