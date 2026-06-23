import type { Metadata } from "next";
import Link from "next/link";
import { Simulator } from "@/components/simulator/Simulator";

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
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            RD&nbsp;Portage
          </Link>
          <p className="hidden text-xs font-semibold text-[#7A8093] sm:block">Simulateur fiscal foyer — 2 à 3 minutes</p>
        </div>
      </header>

      <Simulator />

      <footer className="mt-8 border-t border-[#ECEEF3]">
        <div className="mx-auto max-w-page px-4 py-8 text-xs leading-relaxed text-[#7A8093]">
          <p>RD Portage — 1 rue George Stephenson, 78180 Montigny-le-Bretonneux · RCS Versailles 912 888 013 · +33 1 71 49 71 57</p>
          <p className="mt-1">
            <Link href="/mentions-legales" className="underline">
              Mentions légales
            </Link>
            {" · "}
            <Link href="/confidentialite" className="underline">
              Confidentialité
            </Link>
            {" · "}
            Simulation à valeur indicative — ne constitue pas un conseil fiscal personnalisé.
          </p>
        </div>
      </footer>
    </main>
  );
}
