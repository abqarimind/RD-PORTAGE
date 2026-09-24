import Link from "next/link";

/**
 * Pied de page unique du site public (accueil, /lp/*, /simulateur, pages
 * légales). Il existait cinq copies de ce balisage : c'est ce qui avait
 * laissé les pages légales sur l'ancienne charte crème pendant que le reste
 * du site passait au blanc. Une seule source, donc plus de dérive possible.
 *
 * Les liens font 44 px de haut minimum (cible tactile), le trafic étant
 * très majoritairement mobile.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-[#ECEEF3]">
      <div className="mx-auto max-w-page px-4 py-8 text-xs leading-relaxed text-[#7A8093]">
        <p>RD Portage — 1 rue George Stephenson, 78180 Montigny-le-Bretonneux · RCS Versailles 912 888 013 · +33 1 71 49 71 57</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3">
          <Link href="/mentions-legales" className="inline-flex min-h-[44px] items-center underline">
            Mentions légales
          </Link>
          <Link href="/confidentialite" className="inline-flex min-h-[44px] items-center underline">
            Confidentialité
          </Link>
        </p>
        <p>Simulation à valeur indicative — ne constitue pas un conseil fiscal personnalisé.</p>
      </div>
    </footer>
  );
}
