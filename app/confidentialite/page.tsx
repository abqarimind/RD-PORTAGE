import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { POLICY_VERSION, SEQUENCE_NB_EMAILS } from "@/config/contact";

const SANS = "'Manrope','IBM Plex Sans',sans-serif";

export const metadata = { title: "Politique de confidentialité — RD Portage" };

export default function Confidentialite() {
  return (
    <main className="bg-white" style={{ fontFamily: SANS, color: "#0B0D12" }}>
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Link href="/" className="inline-flex min-h-[44px] items-center text-sm text-[#7A8093] underline">← Retour</Link>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Politique de confidentialité</h1>
        <p className="mt-1 text-xs text-[#9aa0b0]">Version {POLICY_VERSION}</p>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-[#4A5061]">
          <p>
            <strong>Données collectées :</strong> prénom, email, téléphone (optionnel), réponses de simulation
            (statut, revenus, composition du foyer, optimisations) et données d&rsquo;attribution marketing
            (UTM, appareil). Aucune donnée n&rsquo;est collectée sans action volontaire de votre part.
          </p>
          <p>
            <strong>Finalités :</strong> envoi de votre simulation détaillée (objet même du formulaire), séquence de{" "}
            {SEQUENCE_NB_EMAILS} emails de conseil sur 14 jours (uniquement si vous cochez la case facultative prévue à
            cet effet), prise de rendez-vous Diagnostic, statistiques de conversion anonymisées.
          </p>
          <p>
            <strong>Consentement :</strong> l&rsquo;envoi de votre simulation ne dépend d&rsquo;aucune case. Les emails de
            conseil font l&rsquo;objet d&rsquo;une case distincte, facultative et non pré-cochée ; horodatage, version de la
            politique et empreinte technique conservés au registre des consentements. Chaque email contient un lien de
            désinscription en un clic.
          </p>
          <p>
            <strong>Durée de conservation :</strong> 3 ans après le dernier contact, ou suppression immédiate sur demande.
          </p>
          <p>
            <strong>Vos droits :</strong> accès, rectification, effacement, portabilité et opposition — écrivez à
            contact@rdportage.com. Vous pouvez saisir la CNIL (cnil.fr) à tout moment.
          </p>
          <p>
            <strong>Transferts hors de l&rsquo;Union européenne :</strong> certains de nos sous-traitants sont établis aux
            États-Unis. Chaque transfert repose sur une garantie prévue par le RGPD :
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Vercel Inc.</strong> (hébergement du site, États-Unis) : certifié au cadre de protection des données
              UE-États-Unis (EU-US Data Privacy Framework).
            </li>
            <li>
              <strong>Resend</strong> (envoi des emails et stockage des contacts, États-Unis) : certifié au EU-US Data Privacy
              Framework ; les clauses contractuelles types de la Commission européenne sont en outre intégrées à son accord de
              traitement des données.
            </li>
            <li>
              <strong>Meta Platforms</strong> (pixel publicitaire et API de conversions, États-Unis) : uniquement après votre
              consentement aux cookies publicitaires ; certifié au EU-US Data Privacy Framework.
            </li>
          </ul>
          <p>
            <strong>Mesure d&rsquo;audience :</strong> Plausible Analytics, sans cookie tiers ni profilage publicitaire.
          </p>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
