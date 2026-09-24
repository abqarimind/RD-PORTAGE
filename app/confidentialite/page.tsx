import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

const SANS = "'Manrope','IBM Plex Sans',sans-serif";

export const metadata = { title: "Politique de confidentialité — RD Portage" };

export default function Confidentialite() {
  return (
    <main className="bg-white" style={{ fontFamily: SANS, color: "#0B0D12" }}>
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Link href="/" className="inline-flex min-h-[44px] items-center text-sm text-[#7A8093] underline">← Retour</Link>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Politique de confidentialité</h1>
        <p className="mt-1 text-xs text-[#9aa0b0]">Version privacy-2026-06</p>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-[#4A5061]">
          <p>
            <strong>Données collectées :</strong> prénom, email, téléphone (optionnel), réponses de simulation
            (statut, revenus, composition du foyer, optimisations) et données d&rsquo;attribution marketing
            (UTM, appareil). Aucune donnée n&rsquo;est collectée sans action volontaire de votre part.
          </p>
          <p>
            <strong>Finalités :</strong> envoi de votre simulation détaillée, séquence de 6 emails de conseil sur
            14 jours (si consentement explicite), prise de rendez-vous Diagnostic, statistiques de conversion anonymisées.
          </p>
          <p>
            <strong>Consentement :</strong> recueilli par case à cocher non pré-cochée ; horodatage, version de la
            politique et empreinte technique conservés au registre des consentements.
          </p>
          <p>
            <strong>Durée de conservation :</strong> 3 ans après le dernier contact, ou suppression immédiate sur demande.
          </p>
          <p>
            <strong>Vos droits :</strong> accès, rectification, effacement, portabilité et opposition — écrivez à
            contact@rdportage.com. Vous pouvez saisir la CNIL (cnil.fr) à tout moment.
          </p>
          <p>
            <strong>Mesure d&rsquo;audience :</strong> Plausible Analytics, sans cookie tiers ni profilage publicitaire.
          </p>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
