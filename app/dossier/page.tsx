import type { Metadata } from "next";
import Link from "next/link";
import { decodeDossier } from "@/lib/dossier/token";
import { DossierFromStorage } from "@/components/dossier/DossierFromStorage";
import { DossierView } from "@/components/dossier/DossierView";

export const metadata: Metadata = {
  title: "Votre dossier — RD Portage",
  description: "Le détail de votre simulation de portage salarial : rémunération, avantages, impôt du foyer.",
  // Un dossier porte des données personnelles : il ne doit pas être indexé.
  robots: { index: false, follow: false },
};

const SANS = "'Manrope','IBM Plex Sans',sans-serif";

/**
 * Le dossier remplace l'ancien téléchargement PDF (BUG-06).
 *
 * Deux chemins d'accès, jamais d'écran vide :
 *  - avec un lien signé (?d=…&s=…), envoyé par email : le récapitulatif
 *    voyage dans l'URL, donc le dossier s'ouvre depuis n'importe quel
 *    appareil, sans stockage serveur ;
 *  - sans lien : on reconstruit à partir de la simulation enregistrée
 *    localement, et à défaut on renvoie au simulateur.
 */
export default function DossierPage({
  searchParams,
}: {
  searchParams: { d?: string; s?: string };
}) {
  const payload = decodeDossier(searchParams.d, searchParams.s);
  const lienFourniMaisInvalide = Boolean(searchParams.d) && !payload;

  return (
    <main className="bg-[#FAFBFD]" style={{ fontFamily: SANS, color: "#0B0D12" }}>
      <header className="border-b border-[#ECEEF3] bg-white">
        <div className="mx-auto flex max-w-reading items-center justify-between px-4 py-3">
          <Link href="/" className="inline-flex min-h-[44px] items-center text-lg font-extrabold tracking-tight">
            RD&nbsp;Portage
          </Link>
          <Link href="/simulateur" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-[#7A8093] underline underline-offset-4">
            Nouvelle simulation
          </Link>
        </div>
      </header>

      {lienFourniMaisInvalide && (
        <div className="mx-auto max-w-reading px-4 pt-6">
          <p className="rounded-2xl border border-[#F0D9D6] bg-[#FDF6F5] p-4 text-sm text-[#B3261E]">
            Ce lien de dossier n&rsquo;est plus valable ou a été modifié. Nous affichons ci-dessous votre dernière simulation
            enregistrée sur cet appareil, si elle existe.
          </p>
        </div>
      )}

      {payload ? <DossierView payload={payload} /> : <DossierFromStorage />}

      <footer className="border-t border-[#ECEEF3] bg-white">
        <div className="mx-auto max-w-reading px-4 py-8 text-xs leading-relaxed text-[#7A8093]">
          <p>RD Portage — 1 rue George Stephenson, 78180 Montigny-le-Bretonneux · RCS Versailles 912 888 013 · +33 1 71 49 71 57</p>
        </div>
      </footer>
    </main>
  );
}
