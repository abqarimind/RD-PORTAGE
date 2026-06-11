import type { Metadata } from "next";
import Link from "next/link";
import { ConceptA } from "@/components/concepts/ConceptA";
import { SiteFooter } from "@/components/landing/sections";

export const metadata: Metadata = {
  title: "Concept A — L'instruction du dossier (prototype)",
  robots: { index: false, follow: false },
};

export default function ConceptAPage() {
  return (
    <main className="bg-nuit">
      <div className="border-b border-laiton/40 bg-nuit">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-creme/70">
          <p>
            <span className="text-laiton">Prototype interne</span> — Concept A « L'instruction du dossier » (3D scroll-driven)
          </p>
          <p>
            <Link href="/concept-b" className="underline">Voir le concept B</Link>
            {" · "}
            <Link href="/" className="underline">Landing actuelle</Link>
          </p>
        </div>
      </div>
      <ConceptA />
      <SiteFooter />
    </main>
  );
}
