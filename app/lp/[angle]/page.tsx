import type { Metadata } from "next";
import { defaultHeadline, findHeadline, LP_ANGLE_TO_HEADLINE } from "@/config/headlines";
import { Landing } from "@/components/landing/Landing";

/**
 * Anciennes landings payantes /lp/a|b|c (avant le 14/10). Le middleware les
 * réécrit déjà vers la variante de leur angle, ou vers celle de la pub
 * (`utm_content`) ; cette page n'est qu'un repli au cas où il ne passerait
 * pas. Non indexée.
 */
export function generateStaticParams() {
  return Object.keys(LP_ANGLE_TO_HEADLINE).map((angle) => ({ angle }));
}

export const metadata: Metadata = {
  title: "RD Portage — Calcule ton vrai net et ton vrai taux",
  robots: { index: false, follow: false },
};

export default function LpAnglePage({ params }: { params: { angle: string } }) {
  return <Landing headline={findHeadline(LP_ANGLE_TO_HEADLINE[params.angle]) ?? defaultHeadline()} />;
}
