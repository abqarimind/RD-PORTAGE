import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

const SANS = "'Manrope','IBM Plex Sans',sans-serif";

export const metadata = { title: "Mentions légales — RD Portage" };

export default function MentionsLegales() {
  return (
    <main className="bg-white" style={{ fontFamily: SANS, color: "#0B0D12" }}>
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Link href="/" className="inline-flex min-h-[44px] items-center text-sm text-[#7A8093] underline">← Retour</Link>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Mentions légales</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-[#4A5061]">
          <p>
            <strong>Éditeur :</strong> RD Portage, société de portage salarial, 1 rue George Stephenson,
            78180 Montigny-le-Bretonneux — RCS Versailles 912 888 013 — Tél. +33 1 71 49 71 57.
          </p>
          <p><strong>Directeur de la publication :</strong> Ridha Chammam, fondateur.</p>
          <p>
            <strong>Garantie financière :</strong> garantie financière et assurance responsabilité civile
            professionnelle conformes aux articles L1254-26 et suivants du Code du travail.
            {/* TODO(client): add guarantor name + policy number before go-live. */}
          </p>
          <p>
            <strong>Hébergement :</strong> Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA.
          </p>
          <p>
            <strong>Disclaimer fiscal :</strong> les simulations proposées sur ce site ont une valeur strictement
            indicative et ne constituent pas un conseil fiscal personnalisé. Seul un examen de votre situation
            complète, lors du Diagnostic ou avec votre conseil habituel, permet une recommandation engageante.
          </p>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
