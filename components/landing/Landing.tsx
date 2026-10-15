/**
 * Accueil du parcours de conversion (refonte du 14/10).
 *
 * Pensé pour une personne qui touche une pub sur Instagram, sur mobile, dans
 * le navigateur intégré :
 *  - le titre reprend la promesse de SA pub (config/headlines.ts, choisi par
 *    le middleware) : elle sait en 3 secondes qu'elle est au bon endroit ;
 *  - continuité visuelle avec les visuels statiques : fond encre, Manrope,
 *    surligné jaune ; le reste du site garde sa charte blanche ;
 *  - la question 1 du diagnostic est visible dès le premier écran (375 × 667,
 *    bannière cookies comprise) et se joue en un tap ;
 *  - composant serveur : seul le diagnostic est interactif, le reste de la
 *    page n'envoie aucun JavaScript.
 * Les sections sous la ligne de flottaison reprennent des textes déjà en
 * ligne, passés au tutoiement (à valider par Ridha). Rien d'inventé.
 */
import Image from "next/image";
import { DiagnosticProvider } from "@/lib/diagnostic/store";
import { angleOf, HEADLINE_SUBTITLE, type Headline } from "@/config/headlines";
import { FRAIS_GESTION_LABEL, PHONE_LABEL, RCS } from "@/config/contact";
import { MetaViewContent } from "@/components/lp/MetaViewContent";
import { SiteFooter } from "@/components/SiteFooter";
import { Diagnostic } from "./Diagnostic";
import { TelLink } from "./TelLink";

const INK = "#0B0D12";
const MUTED = "#4A5061";
/** Surligné des visuels statiques. */
const YELLOW = "#FFE14D";

function Titre({ headline }: { headline: Headline }) {
  const i = headline.title.indexOf(headline.highlight);
  const avant = headline.title.slice(0, i);
  const apres = headline.title.slice(i + headline.highlight.length);
  return (
    <h1 className="text-[28px] font-extrabold leading-[1.12] tracking-tight min-[400px]:text-[32px] md:text-5xl">
      {avant}
      <span
        className="rounded-md px-1.5 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
        style={{ backgroundColor: YELLOW, color: INK }}
      >
        {headline.highlight}
      </span>
      {apres}
    </h1>
  );
}

export function Landing({ headline }: { headline: Headline }) {
  return (
    <DiagnosticProvider>
      <main className="bg-white" style={{ color: INK }}>
        {/* —————— premier écran : la promesse de la pub, puis la question 1 —————— */}
        <section className="px-4 pb-16 pt-2 text-white md:pb-24" style={{ backgroundColor: INK }}>
          <div className="mx-auto max-w-md md:max-w-2xl">
            <div className="flex min-h-[44px] items-center justify-between">
              <p className="text-base font-extrabold tracking-tight">RD&nbsp;Portage</p>
              <p className="rounded-full border border-white/25 px-3 py-1 text-xs font-bold">{FRAIS_GESTION_LABEL} de frais de gestion</p>
            </div>
            {headline.withFounder && (
              <p className="mt-3 flex w-fit items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 text-xs font-bold">
                <Image src="/ridha.png" alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" priority />
                Ridha Chammam, fondateur, ancien consultant porté
              </p>
            )}
            <div className="mt-4">
              <Titre headline={headline} />
            </div>
            <p className="mt-2 text-[15px] leading-snug text-white/80">{HEADLINE_SUBTITLE}</p>
          </div>
        </section>

        <div className="-mt-12 px-4 md:-mt-16">
          <div className="mx-auto max-w-md rounded-3xl bg-white p-4 shadow-[0_12px_40px_rgba(11,13,18,0.14)] ring-1 ring-[#ECEEF3] md:p-6">
            <Diagnostic />
          </div>
        </div>

        {/* —————— pour qui fait défiler —————— */}
        <section className="mx-auto max-w-md px-4 pb-6 pt-12 md:max-w-2xl" aria-labelledby="comment">
          <h2 id="comment" className="text-2xl font-extrabold leading-tight tracking-tight">
            Trois étapes, zéro zone grise.
          </h2>
          <ol className="mt-5 space-y-4">
            {[
              ["Diagnostic flash", "Trois questions, une fourchette immédiate, sans e-mail."],
              [
                "Simulateur foyer",
                "Le seul calcul qui intègre enfants, garde alternée, frais réels et PER, plafonds légaux inclus.",
              ],
              ["Rappel de Ridha", "Tu valides ton chiffre avec lui. Proposition ferme, signature possible sous 48 h."],
            ].map(([titre, texte], i) => (
              <li key={titre} className="flex gap-4">
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
                  style={{ backgroundColor: YELLOW, color: INK }}
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-base font-extrabold">{titre}</h3>
                  <p className="mt-0.5 text-sm leading-relaxed" style={{ color: MUTED }}>
                    {texte}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-md px-4 py-6 md:max-w-2xl" aria-label="Le fondateur">
          <div className="flex items-center gap-4 rounded-2xl border border-[#ECEEF3] p-4">
            <Image src="/ridha.png" alt="Ridha Chammam" width={56} height={56} className="h-14 w-14 rounded-full object-cover" />
            <div>
              <p className="text-sm font-extrabold">« J&rsquo;ai moi-même été consultant porté. »</p>
              <p className="text-xs" style={{ color: MUTED }}>
                Ridha Chammam, fondateur de RD Portage
              </p>
            </div>
          </div>
          <p className="mt-4 rounded-2xl p-4 text-sm leading-relaxed" style={{ backgroundColor: "#E7F6EE", color: "#245A41" }}>
            <strong>Garde-fous intégrés.</strong> Frais professionnels limités à 30 % du salaire brut (règle interne RD Portage),
            avantages dans les plafonds URSSAF, chaque chiffre du site sourcé ou retiré. La simulation reste indicative et ne
            remplace pas un conseil fiscal personnalisé.
          </p>
        </section>

        <section className="mx-auto max-w-md px-4 pb-12 pt-6 md:max-w-2xl" aria-labelledby="tarif">
          <div className="rounded-3xl p-6 text-center" style={{ backgroundColor: INK, color: "#fff" }}>
            <p id="tarif" className="text-xs font-bold uppercase tracking-widest text-white/70">
              Un seul tarif, tout compris
            </p>
            <p className="mt-2 text-5xl font-extrabold">
              <span className="rounded-md px-1.5" style={{ backgroundColor: YELLOW, color: INK }}>
                {FRAIS_GESTION_LABEL}
              </span>
            </p>
            <p className="mx-auto mt-3 max-w-sm text-sm text-white/80">
              de frais de gestion. 400 € pour 10 000 € de CA porté, sans ligne cachée en bas de page.
            </p>
            <a
              href="#diagnostic"
              className="mt-5 flex min-h-[52px] items-center justify-center rounded-full px-6 py-3 text-base font-extrabold"
              style={{ backgroundColor: YELLOW, color: INK }}
            >
              Faire mon diagnostic
            </a>
            <TelLink
              from="lp_tarif_tel"
              className="mt-2 flex min-h-[48px] items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-bold text-white"
            >
              Appeler l&rsquo;équipe : {PHONE_LABEL}
            </TelLink>
          </div>
          <p className="mt-4 text-center text-xs" style={{ color: MUTED }}>
            RD Portage, société de portage salarial · {RCS}
          </p>
        </section>

        <SiteFooter />
        <MetaViewContent contentName={angleOf(headline)} />
      </main>
    </DiagnosticProvider>
  );
}
