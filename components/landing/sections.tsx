/**
 * Landing sections 3 to 8 — server components, copy in French.
 * Emotional arc: fear (Atarhib) → reassurance (Targhib, founder) → adhesion
 * (proof) → decision bridge (final CTA).
 * Every figure comes from content/claims.ts; unsourced claims render as
 * [SOURCE REQUISE] and must not ship.
 */
import Image from "next/image";
import Link from "next/link";
import { CLAIMS, COMPETITORS, claimText, comparatifLegalValidated } from "@/content/claims";

/** Until a booking tool (Calendly) exists, the Diagnostic CTA dials Ridha. */
const RDV_URL = process.env.NEXT_PUBLIC_RDV_URL ?? "tel:+33632988723";

export function AtarhibSection() {
  return (
    <section className="bg-creme">
      <div className="mx-auto max-w-page px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-widest text-laiton">Ce que la loi a changé</p>
        <h2 className="display mt-2 max-w-2xl text-2xl text-encre md:text-4xl">
          Ce que le redressement personnel change pour vous depuis 2024
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-[2fr,1fr]">
          <div className="space-y-4 text-base leading-relaxed text-encre/90">
            <p>{claimText(CLAIMS.redressement_personnel_2024)}</p>
            <p>{claimText(CLAIMS.prescription_3_ans)}</p>
            <p>
              Les montages que vous croisez peut-être — une partie du chiffre en espèces, un CPF
              transformé en enveloppe, une facturation qui transite par l&rsquo;étranger — laissent
              des traces comptables. Quand le contrôle arrive, c&rsquo;est le salarié porté qui rend
              des comptes : rappel de cotisations, impôt redressé, et pour les titulaires d&rsquo;un
              titre de séjour, un dossier fragilisé au pire moment.
            </p>
          </div>
          <aside className="note-juridique h-fit">
            <p className="display text-lg text-encre">L&rsquo;arithmétique d&rsquo;un redressement</p>
            <p className="mt-2 tnum">{claimText(CLAIMS.exemple_15k_60k)}</p>
            {CLAIMS.exemple_15k_60k.condition && (
              <p className="mt-3 text-xs text-encre/60">{CLAIMS.exemple_15k_60k.condition}</p>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}

export function TarghibSection() {
  const rows = [
    CLAIMS.avantages_18000,
    CLAIMS.frais_gestion_4,
    CLAIMS.ca_optimise_40,
    CLAIMS.restitution_64,
  ];
  return (
    <section className="bg-nuit text-creme">
      <div className="mx-auto max-w-page px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-widest text-laiton">Dans les règles, noir sur blanc</p>
        <h2 className="display mt-2 max-w-2xl text-2xl md:text-4xl">Ce que le cadre légal permet vraiment</h2>
        <div className="mt-8 divide-y divide-laiton/40 border-y border-laiton/40">
          {rows.map((claim, i) => (
            <div key={claim.id} className="grid gap-2 py-5 md:grid-cols-[140px,1fr] md:gap-8">
              <p className="display text-2xl text-laiton tnum">{claim.value ?? `${i + 1}.`}</p>
              <div>
                <p className="text-base leading-relaxed">{claimText(claim)}</p>
                {claim.condition && (
                  <p className="mt-1 text-xs text-creme/60">
                    Condition d&rsquo;éligibilité — {claim.condition}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-creme/60">
          Chaque dispositif est plafonné et conditionné par la doctrine URSSAF ; le simulateur applique ces plafonds, pas la
          version commerciale.
        </p>
      </div>
    </section>
  );
}

export function FounderSection() {
  return (
    <section className="bg-creme">
      <div className="mx-auto max-w-page px-4 py-16 md:py-24">
        <div className="filet max-w-3xl pt-6">
          <h2 className="display text-2xl text-encre md:text-3xl">« J&rsquo;ai moi-même été consultant porté. »</h2>
          <div className="mt-5 space-y-4 text-base leading-relaxed text-encre/90">
            <p>
              Avant de créer RD Portage, j&rsquo;ai fait le même chemin que vous : consultant en ESN, puis
              porté chez les autres. J&rsquo;ai connu les promesses de « net maximal » qui ne tiennent pas à
              un contrôle, les frais de gestion qui gonflent en bas de page, et les démarches qui se
              compliquent quand votre titre de séjour ne vous laisse pas créer votre société.
            </p>
            <p>
              RD Portage existe pour une raison simple : qu&rsquo;un consultant puisse optimiser chaque euro
              de son chiffre d&rsquo;affaires <em>dans</em> les règles, et dormir tranquille. C&rsquo;est moins
              spectaculaire que les montages — c&rsquo;est aussi ce qui reste debout après un contrôle URSSAF.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <Image
              src="/ridha.png"
              alt="Ridha Chammam, fondateur de RD Portage"
              width={88}
              height={88}
              className="rounded-full border border-laiton"
            />
            <div>
              <p className="display text-lg text-encre">Ridha Chammam</p>
              <p className="text-sm text-encre/70">
                Fondateur de RD Portage — Founder &amp; CEO, RIDCHA DATA (ESN)
                <br />
                <a href="tel:+33632988723" className="underline">+33 6 32 98 87 23</a> · ridcha@ridchadata.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProofSection() {
  const nominative = comparatifLegalValidated();
  return (
    <section className="bg-creme">
      <div className="mx-auto max-w-page px-4 pb-16 md:pb-24">
        <div className="filet pt-6">
          <h2 className="display text-2xl text-encre md:text-3xl">Les faits, vérifiables</h2>
          <p className="mt-3 max-w-2xl text-base text-encre/90">{claimText(CLAIMS.preuve_societe)}</p>
          <p className="mt-1 text-sm text-encre/70">
            Garantie financière et assurance RC professionnelle conformes à l&rsquo;ordonnance de 2015 sur le portage salarial.
          </p>

          <h3 className="display mt-10 text-xl text-encre">Frais de gestion : la comparaison</h3>
          <table className="mt-4 w-full max-w-2xl border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-laiton text-xs uppercase tracking-wide text-encre/60">
                <th className="py-2 pr-4 font-medium">Société</th>
                <th className="py-2 font-medium">Frais de gestion affichés</th>
              </tr>
            </thead>
            <tbody className="tnum">
              <tr className="border-b border-laiton/40">
                <td className="py-3 pr-4 font-medium text-encre">RD Portage</td>
                <td className="py-3 text-valide">4 % — tout compris</td>
              </tr>
              {COMPETITORS.map((c) => (
                <tr key={c.anonymousLabel} className="border-b border-laiton/40 text-encre/80">
                  <td className="py-3 pr-4">{nominative && c.source ? c.name : c.anonymousLabel}</td>
                  <td className="py-3">
                    {c.managementFee}
                    {nominative && c.source ? (
                      <span className="ml-2 text-xs text-encre/50">
                        (source : {c.source.label}, relevé le {c.source.checkedAt})
                      </span>
                    ) : (
                      <span className="ml-2 text-xs text-encre/50">marge publique moyenne du marché</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 max-w-2xl text-xs text-encre/60">
            {nominative
              ? "Données issues exclusivement de sources officielles publiques, URL et date de relevé disponibles sur demande."
              : "Version anonymisée. La comparaison nominative (sources officielles publiques, URL + date de relevé) sera activée après validation juridique."}
          </p>
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section id="rdv" className="bg-nuit text-creme">
      <div className="mx-auto max-w-page px-4 py-16 text-center md:py-24">
        {/* Locked promise, repeated as the decision bridge. */}
        <h2 className="display mx-auto max-w-2xl text-2xl md:text-4xl">
          Vous payez trop d&rsquo;impôts sans le savoir.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-creme/90">
          Calculez votre meilleur taux d&rsquo;imposition en 2 à 3 minutes. Gratuit, sans engagement.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/simulateur" className="cta-primary">
            Lancer le simulateur complet
          </Link>
          <a
            href={RDV_URL}
            className="rounded border border-laiton px-6 py-3 font-sans text-base text-creme transition hover:bg-laiton hover:text-encre"
          >
            Déjà décidé ? Appelez Ridha — 06 32 98 87 23
          </a>
        </div>
        <p className="mt-4 text-xs text-creme/60">
          À l&rsquo;issue du call Diagnostic : proposition ferme, signature possible sous 48 h.
        </p>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-creme">
      <div className="mx-auto max-w-page px-4 py-10">
        <div className="filet pt-6 text-xs leading-relaxed text-encre/70">
          <p>
            RD Portage — 1 rue George Stephenson, 78180 Montigny-le-Bretonneux · RCS Versailles 912 888 013 · +33 1 71 49 71 57
          </p>
          <p className="mt-2">
            <Link href="/mentions-legales" className="underline">Mentions légales</Link>
            {" · "}
            <Link href="/confidentialite" className="underline">Politique de confidentialité</Link>
            {" · "}
            <a href="https://www.cnil.fr" className="underline" rel="noopener noreferrer">CNIL</a>
            {" · "}
            Désinscription possible à tout moment via le lien présent dans chaque email.
          </p>
          <p className="mt-2 italic">
            Simulation à valeur indicative — ne constitue pas un conseil fiscal personnalisé.
          </p>
        </div>
      </div>
    </footer>
  );
}
