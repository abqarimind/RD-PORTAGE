import type { Metadata } from "next";
import Link from "next/link";
import { Simulator } from "@/components/simulator/Simulator";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Simulateur IR foyer — RD Portage",
  description:
    "Le seul simulateur de portage salarial qui calcule le taux d'imposition réel de votre foyer : situation familiale, frais réels, PER, impatrié, dons. 2 à 3 minutes.",
};

const SANS = "'Manrope','IBM Plex Sans',sans-serif";

export default function SimulateurPage() {
  return (
    <main className="bg-white" style={{ fontFamily: SANS, color: "#0B0D12" }}>
      <header className="sticky top-0 z-30 border-b border-[#ECEEF3] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-page items-center justify-between px-4 py-3">
          <Link href="/" className="inline-flex min-h-[44px] items-center text-lg font-extrabold tracking-tight">
            RD&nbsp;Portage
          </Link>
          <p className="hidden text-xs font-semibold text-[#7A8093] sm:block">Simulateur fiscal foyer — 2 à 3 minutes</p>
        </div>
      </header>

      <Simulator />

      <div className="mt-8">
        <SiteFooter />
      </div>
    </main>
  );
}
