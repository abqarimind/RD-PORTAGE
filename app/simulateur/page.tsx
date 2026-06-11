import type { Metadata } from "next";
import Link from "next/link";
import { Simulator } from "@/components/simulator/Simulator";
import { SiteFooter } from "@/components/landing/sections";

export const metadata: Metadata = {
  title: "Simulateur IR foyer — RD Portage",
  description:
    "Le seul simulateur de portage salarial qui calcule le taux d'imposition réel de votre foyer : situation familiale, frais réels, PER, impatrié, dons. 2 à 3 minutes.",
};

export default function SimulateurPage() {
  return (
    <main className="bg-creme">
      <header className="bg-nuit">
        <div className="mx-auto flex max-w-page items-center justify-between px-4 py-4">
          <Link href="/" className="display text-lg text-creme">RD Portage</Link>
          <p className="hidden text-xs text-creme/70 sm:block">Simulateur fiscal foyer — 2 à 3 minutes</p>
        </div>
      </header>
      <Simulator />
      <SiteFooter />
    </main>
  );
}
