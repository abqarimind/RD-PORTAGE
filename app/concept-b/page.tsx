import type { Metadata } from "next";
import Link from "next/link";
import { ConceptB } from "@/components/concepts/ConceptB";
import { SiteFooter } from "@/components/landing/sections";

export const metadata: Metadata = {
  title: "Concept B — Le billet de 100 € (prototype)",
  robots: { index: false, follow: false },
};

export default function ConceptBPage() {
  return (
    <main className="bg-nuit">
      <div className="border-b border-laiton/40 bg-nuit">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-creme/70">
          <p>
            <span className="text-laiton">Prototype interne</span> — Concept B « Le billet de 100 € » (2D, 100 % responsive)
          </p>
          <p>
            <Link href="/concept-a" className="underline">Voir le concept A</Link>
            {" · "}
            <Link href="/" className="underline">Landing actuelle</Link>
          </p>
        </div>
      </div>
      <ConceptB />
      <SiteFooter />
    </main>
  );
}
