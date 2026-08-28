"use client";

/**
 * Productised conversion landing, derived from /concept-c's design language
 * (light fintech + brass "fil doré") but rebuilt mobile-first and
 * instrumented for paid Meta traffic:
 *  - 3 hero angles (message match), only the above-the-fold block changes;
 *  - two layout variants: "flash" (diagnostic form) and "vsl" (video);
 *  - optional navigation (hidden on paid traffic via the /lp ads layout);
 *  - interactive flash diagnostic (no email) feeding the full simulator;
 *  - Meta ViewContent on mount.
 *
 * Single typographic level (Manrope, no serif — client preference); brass on
 * the important figures. Honesty guardrails: every unvalidated
 * figure/testimonial is a marked placeholder, never shipped as fact.
 */
import Image from "next/image";
import Link from "next/link";
import { CLAIMS } from "@/content/claims";
import { computePortage } from "@/lib/fiscal/portage";
import { trackEvent } from "@/lib/tracking/events";
import { metaContact } from "@/lib/tracking/meta";
import { FlashDiagnostic } from "./FlashDiagnostic";
import { MetaViewContent } from "./MetaViewContent";

export type Angle = "a" | "b" | "c";

/* design tokens carried over from concept-c */
const PEACH = "#FFF1DE";
const LILAC = "#EFF0FB";
const MINT = "#E7F6EE";
const INK = "#0B0D12";
const BRASS = "#B08D57";
// Client préfère un seul niveau typographique (pas de serif) : SERIF = Manrope.
const SANS = "'Manrope','IBM Plex Sans',sans-serif";
const SERIF = SANS;

const PHONE = "+33632988723";
const PHONE_LABEL = "06 32 98 87 23";

/* Reference case computed by the real fiscal engine — not a marketing number. */
const REF = computePortage({ tjm: 420, days: 20, ndf: 500, cagnotteMay: 1570, mealVouchers: true });
const PCT = Math.round(REF.restitutionRate * 100);

const eur = (n: number) => n.toLocaleString("fr-FR");

function Scribble() {
  return (
    <svg viewBox="0 0 220 14" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full" aria-hidden>
      <path d="M4 9 C 60 2, 150 2, 216 7" fill="none" stroke={BRASS} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/* —————————————————————————— hero angles —————————————————————————— */

interface HeroCopy {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  /** One short, sourced proof/objection line under the subhead. */
  proof?: React.ReactNode;
  withFounder?: boolean;
}

function heroCopy(angle: Angle): HeroCopy {
  switch (angle) {
    case "a":
      // ANGLE A — Warning (framework PAS : Problème → Agitation → Solution).
      // H1 = ancre de message-match avec l'annonce ; on ne la réécrit pas.
      // TODO: VALIDATION JURIDIQUE — la formulation « depuis 2024 / c'est toi »
      // est marquée à valider avant diffusion (cf. content/claims.ts →
      // redressement_personnel_2024.condition). Ne pas diffuser sans accord.
      return {
        eyebrow: "Portage salarial — le risque qu'on ne te montre pas",
        title: (
          <>
            Depuis 2024, ce n&rsquo;est plus ta société de portage qui est{" "}
            <span className="relative inline-block">
              redressée
              <Scribble />
            </span>
            . C&rsquo;est toi.
          </>
        ),
        subtitle: (
          <>
            Frais « gonflés », cagnotte opaque, avantages réservés à quelques-uns : quand l&rsquo;URSSAF requalifie, la société
            paie l&rsquo;amende — mais c&rsquo;est <strong>ta rémunération</strong> qui est corrigée, jusqu&rsquo;à 3 ans en
            arrière. Vois en 30 secondes ce qu&rsquo;un cadre 100 % légal te laisse vraiment.
          </>
        ),
        proof: <>Chez RD : frais réels, justifiés, proportionnés. Zéro montage gris.</>,
      };
    case "c":
      // ANGLE C — Founder (autorité + preuve vécue, chiffres réels, zéro hype).
      return {
        eyebrow: "RD Portage — par Ridha, ex-consultant porté",
        title: (
          <>
            J&rsquo;ai été porté avant de créer RD Portage. Calcule ce que tu touches{" "}
            <span className="relative inline-block">
              vraiment
              <Scribble />
            </span>
            .
          </>
        ),
        subtitle: (
          <>
            J&rsquo;ai vu de l&rsquo;intérieur les montages qui finissent en redressement et les simulateurs qui enjolivent le
            net. J&rsquo;ai construit l&rsquo;inverse : un cadre 100 % légal et le seul simulateur qui calcule le vrai taux
            d&rsquo;imposition de ton foyer — enfants, garde alternée, frais réels, PER.
          </>
        ),
        proof: <>~30 consultants portés depuis 2021. 4 % de frais, tout compris.</>,
        withFounder: true,
      };
    case "b":
    default:
      // ANGLE B — Vrai net (défaut, promesse verrouillée de concept-c).
      return {
        eyebrow: "Portage salarial 100 % légal — 4 % de frais",
        title: (
          <>
            Vous payez{" "}
            <span className="relative inline-block">
              trop d&rsquo;impôts
              <Scribble />
            </span>{" "}
            sans le savoir. Calculez votre vrai taux.
          </>
        ),
        subtitle: (
          <>
            En portage classique, on ne récupère en moyenne que ~50 % de son CA — sans jamais connaître son vrai taux
            d&rsquo;imposition. Le seul simulateur qui calcule le taux réel de votre foyer (enfants, garde alternée, frais réels,
            PER) et ce que vous laissez sur la table. Gratuit, 2 à 3 minutes.
          </>
        ),
        proof: <>4 % de frais tout compris, là où le marché facture souvent 5 à 10 %.</>,
      };
  }
}

/* —————————————————————————— sections —————————————————————————— */

function Header({ showNav }: { showNav: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#ECEEF3] bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-page items-center justify-between px-4 py-3">
        <p className="text-lg font-extrabold tracking-tight">RD&nbsp;Portage</p>
        {showNav && (
          <nav className="hidden gap-8 text-sm font-medium text-[#4A5061] md:flex">
            {[
              ["Méthode", "#methode"],
              ["Preuves", "#preuves"],
              ["Tarif", "#tarif"],
            ].map(([label, href]) => (
              <a key={label} href={href} className="transition-colors hover:text-[#0B0D12]">
                {label}
              </a>
            ))}
          </nav>
        )}
        {/* Single primary CTA — scrolls to the in-hero diagnostic. */}
        <a
          href="#diagnostic"
          className="rounded-full bg-[#0B0D12] px-5 py-2.5 text-sm font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
        >
          Calculer mon vrai taux
        </a>
      </div>
    </header>
  );
}

function HeroFlash({ angle }: { angle: Angle }) {
  const copy = heroCopy(angle);
  return (
    <section className="mx-auto max-w-page px-4 pb-12 pt-8 md:pt-12">
      <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
        <div className="text-center md:text-left">
          {copy.withFounder && (
            <span className="mx-auto mb-4 flex w-fit items-center gap-3 rounded-full bg-[#F6F7FA] py-1.5 pl-1.5 pr-4 md:mx-0">
              <Image src="/ridha.png" alt="Ridha Chammam" width={36} height={36} className="rounded-full" />
              <span className="text-xs font-bold text-[#4A5061]">Ridha Chammam — fondateur</span>
            </span>
          )}
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BRASS }}>
            {copy.eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight md:text-5xl" style={{ fontFamily: SERIF }}>
            {copy.title}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#4A5061] md:mx-0">{copy.subtitle}</p>
          {copy.proof && (
            <p
              className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold md:mx-0"
              style={{ borderColor: "#E6DCC8", backgroundColor: "#FBF7EF", color: "#8A6B3F" }}
            >
              <span aria-hidden>✓</span>
              {copy.proof}
            </p>
          )}
          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-[#7A8093] md:justify-start">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: BRASS }} />
            ~30 consultants portés depuis 2021 · RCS Versailles 912 888 013
          </div>
        </div>
        {/* Interactive flash diagnostic — the hero conversion mechanism. */}
        <FlashDiagnostic angle={angle} />
      </div>
    </section>
  );
}

function StatChips() {
  const chips: [string, string][] = [
    [CLAIMS.frais_gestion_4.value ?? "4 %", "frais de gestion, tout compris"],
    [`${PCT} %`, "du CA restitué (cas de référence TJM 420 €)"],
    ["2021", "création — RCS Versailles"],
    [CLAIMS.avantages_18000.value ?? "18 000 €/an", "d'avantages légaux possibles"],
  ];
  return (
    <section className="mx-auto max-w-page px-4 pb-12">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {chips.map(([big, small]) => (
          <div key={small} className="rounded-2xl border border-[#ECEEF3] bg-white px-4 py-4 text-center md:text-left">
            <p className="text-2xl font-extrabold tabular-nums" style={{ color: BRASS, fontFamily: SERIF }}>
              {big}
            </p>
            <p className="mt-1 text-xs font-medium text-[#7A8093]">{small}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Method() {
  const steps: [string, string, string, string][] = [
    ["01", "Diagnostic flash", "Trois questions, une fourchette immédiate — sans email.", PEACH],
    ["02", "Simulateur foyer", "Le seul calcul qui intègre enfants, garde alternée, frais réels, PER — plafonds légaux inclus.", LILAC],
    ["03", "Diagnostic 30 min", "Vous validez votre chiffre avec Ridha. Proposition ferme, signature possible sous 48 h.", MINT],
  ];
  return (
    <section id="methode" className="border-y border-[#ECEEF3] bg-[#FAFBFD]">
      <div className="mx-auto max-w-page px-4 py-14">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BRASS }}>
          La méthode
        </p>
        <h2 className="mt-2 max-w-xl text-3xl font-extrabold leading-tight tracking-tight md:text-4xl" style={{ fontFamily: SERIF }}>
          Trois étapes, zéro zone grise.
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map(([num, title, body, tint]) => (
            <div key={num} className="relative overflow-hidden rounded-3xl p-6" style={{ backgroundColor: tint }}>
              <p className="text-5xl font-extrabold tabular-nums" style={{ color: BRASS, opacity: 0.25, fontFamily: SERIF }}>
                {num}
              </p>
              <h3 className="mt-2 text-xl font-extrabold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#4A5061]">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Atarhib() {
  return (
    <section id="preuves" className="mx-auto max-w-page px-4 py-14">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-extrabold leading-tight tracking-tight md:text-4xl" style={{ fontFamily: SERIF }}>
            Depuis 2024, un montage opaque se paie sur{" "}
            <span className="relative inline-block">
              votre
              <Scribble />
            </span>{" "}
            paie.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[#4A5061]">
            {/* Sourced mechanism (cf. content/claims.ts → redressement_personnel_2024). */}
            En cas de redressement URSSAF sur des frais ou avantages injustifiés, la régularisation s&rsquo;impute sur la
            rémunération du porté — l&rsquo;URSSAF pouvant remonter jusqu&rsquo;à 3 ans. Cash en main, CPF détourné, facturation
            offshore : l&rsquo;avantage est immédiat, le risque est pour vous. Notre réponse : un cadre 100 % légal où
            l&rsquo;optimisation vient des dispositifs officiels, pas des angles morts.
          </p>
          <div className="mt-6 flex items-center gap-4 rounded-2xl border border-[#ECEEF3] bg-white p-4">
            <Image src="/ridha.png" alt="Ridha Chammam" width={56} height={56} className="rounded-full" />
            <div>
              <p className="text-sm font-bold">« J&rsquo;ai moi-même été consultant porté. »</p>
              <p className="text-xs text-[#7A8093]">Ridha Chammam — fondateur de RD Portage</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl p-6" style={{ backgroundColor: MINT }}>
          <p className="text-sm font-bold" style={{ color: "#2F6B4F" }}>
            Garde-fous intégrés
          </p>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "#2F6B4F" }}>
            Frais plafonnés à 30 % du CA, avantages dans les plafonds URSSAF, chaque chiffre du site sourcé ou retiré. La
            simulation reste indicative et ne remplace pas un conseil fiscal personnalisé.
          </p>
        </div>
      </div>
    </section>
  );
}

function SocialProof() {
  // TODO: DONNÉE RÉELLE — en attente Ridha : vrais témoignages (nom, photo,
  // accord écrit) et logos partenaires (droits). Placeholders d'ici là.
  const testimonials = [
    {
      quote:
        "Le simulateur m'a donné le vrai chiffre, foyer compris — personne d'autre ne le calcule. Signature en 48 h, comme annoncé.",
      who: "Consultant data, ex-ESN — témoignage à recueillir",
      bg: PEACH,
    },
    {
      quote: "Je venais d'un portage à 8 % sans aucune optimisation. La différence était exactement celle annoncée.",
      who: "Consultante SAP — témoignage à recueillir",
      bg: LILAC,
    },
  ];
  return (
    <section className="border-y border-[#ECEEF3] bg-[#FAFBFD]">
      <div className="mx-auto max-w-page px-4 py-14">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-[#7A8093]">
          {/* TODO: DONNÉE RÉELLE — en attente Ridha : logos clients + droits. */}
          Logos clients / partenaires — en attente de validation
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {testimonials.map((t) => (
            <figure key={t.who} className="rounded-3xl border border-[#ECEEF3] bg-white p-6">
              <p className="text-sm font-bold" style={{ color: BRASS }}>
                ★★★★★
              </p>
              <blockquote className="mt-3 text-sm leading-relaxed text-[#4A5061]">« {t.quote} »</blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-white" style={{ backgroundColor: t.bg }} aria-hidden />
                <p className="text-xs font-semibold text-[#7A8093]">{t.who}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingCta() {
  return (
    <section id="tarif" className="mx-auto max-w-page px-4 py-16 text-center">
      <div className="rounded-3xl px-6 py-12 md:py-16" style={{ backgroundColor: PEACH }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#8A6B3F" }}>
          Un seul tarif, tout compris
        </p>
        <p className="mt-3 text-5xl font-extrabold tabular-nums" style={{ color: BRASS, fontFamily: SERIF }}>
          4&nbsp;%
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#4A5061]">
          de frais de gestion. 400 € pour 10 000 € de CA porté — sans ligne cachée en bas de page.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {/* Primary CTA → in-hero diagnostic. */}
          <a
            href="#diagnostic"
            className="w-full rounded-full bg-[#0B0D12] px-6 py-3 text-sm font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:w-auto"
          >
            Calculer mon vrai taux — 2 à 3 min
          </a>
          {/* Secondary CTA → call Ridha (Contact event). */}
          <a
            href={`tel:${PHONE}`}
            onClick={() => {
              trackEvent("rdv_clicked", { from: "lp_pricing" });
              metaContact({ from: "lp_pricing" });
            }}
            className="w-full rounded-full border border-[#D8DCE6] bg-white px-6 py-3 text-sm font-bold text-[#0B0D12] transition-colors hover:border-[#B08D57] sm:w-auto"
          >
            Appeler Ridha — {PHONE_LABEL}
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#ECEEF3]">
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
  );
}

/* —————————————————————————— VSL variant —————————————————————————— */

const PRIMARY_BTN =
  "w-full rounded-full bg-[#0B0D12] px-6 py-3 text-sm font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:w-auto";
const OUTLINE_BTN =
  "w-full rounded-full border border-[#D8DCE6] bg-white px-6 py-3 text-sm font-bold text-[#0B0D12] transition-colors hover:border-[#B08D57] sm:w-auto";

/** Responsive 16:9 VSL frame. Plays NEXT_PUBLIC_VSL_URL when set, otherwise a
 *  clearly-marked placeholder that nudges to the diagnostic. */
function VslPlayer() {
  const url = process.env.NEXT_PUBLIC_VSL_URL;
  return (
    <div className="mx-auto mt-8 w-full max-w-3xl">
      <div
        className="relative aspect-video w-full overflow-hidden rounded-3xl shadow-xl ring-1 ring-[#ECEEF3]"
        style={{ background: "linear-gradient(135deg,#FFF1DE,#EFF0FB)" }}
      >
        {url ? (
          <iframe
            src={url}
            title="Vidéo RD Portage"
            className="absolute inset-0 h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
          />
        ) : (
          <a href="#diagnostic" className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg transition-transform duration-200 hover:scale-110">
              <svg width="20" height="22" viewBox="0 0 20 22" aria-hidden>
                <path d="M2 2l16 9-16 9z" fill="#0B0D12" />
              </svg>
            </span>
            <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-[#4A5061]">Votre VSL ici — aperçu</span>
          </a>
        )}
      </div>
      {!url && (
        // TODO: DONNÉE RÉELLE — en attente Ridha : vidéo VSL (définir NEXT_PUBLIC_VSL_URL).
        <p className="mt-2 text-center text-xs text-[#9aa0b0]">Emplacement vidéo — la VSL de Ridha s&rsquo;intègre ici.</p>
      )}
    </div>
  );
}

function HeroVsl({ angle }: { angle: Angle }) {
  const copy = heroCopy(angle);
  return (
    <section className="mx-auto max-w-4xl px-4 pb-10 pt-8 text-center md:pt-12">
      {copy.withFounder && (
        <span className="mx-auto mb-4 flex w-fit items-center gap-3 rounded-full bg-[#F6F7FA] py-1.5 pl-1.5 pr-4">
          <Image src="/ridha.png" alt="Ridha Chammam" width={36} height={36} className="rounded-full" />
          <span className="text-xs font-bold text-[#4A5061]">Ridha Chammam — fondateur</span>
        </span>
      )}
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BRASS }}>
        {copy.eyebrow}
      </p>
      <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">{copy.title}</h1>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#4A5061]">{copy.subtitle}</p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a href="#diagnostic" className={PRIMARY_BTN}>
          Calculer mon vrai taux
        </a>
        <a
          href={`tel:${PHONE}`}
          onClick={() => {
            trackEvent("rdv_clicked", { from: "lp_vsl_hero" });
            metaContact({ from: "lp_vsl_hero" });
          }}
          className={OUTLINE_BTN}
        >
          Appeler Ridha
        </a>
      </div>
      {copy.proof && (
        <p
          className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold"
          style={{ borderColor: "#E6DCC8", backgroundColor: "#FBF7EF", color: "#8A6B3F" }}
        >
          <span aria-hidden>✓</span>
          {copy.proof}
        </p>
      )}
      <VslPlayer />
      <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-[#7A8093]">
        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: BRASS }} />
        ~30 consultants portés depuis 2021 · RCS Versailles 912 888 013
      </div>
    </section>
  );
}

/** Flash diagnostic as a standalone section (used below the VSL hero). */
function DiagnosticSection({ angle }: { angle: Angle }) {
  return (
    <section className="mx-auto max-w-page px-4 pb-12">
      <div className="rounded-3xl border border-[#ECEEF3] bg-[#FAFBFD] p-5 md:p-8">
        <div className="grid items-center gap-6 md:grid-cols-2">
          <div className="text-center md:text-left">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BRASS }}>
              30 secondes
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">Faites le diagnostic flash maintenant.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#4A5061] md:mx-0">
              Trois questions, une fourchette immédiate — sans email. Puis le calcul précis de votre foyer en 2 à 3 minutes.
            </p>
          </div>
          <FlashDiagnostic angle={angle} />
        </div>
      </div>
    </section>
  );
}

/* —————————————————————————— page —————————————————————————— */

export type LandingVariant = "flash" | "vsl";

export function LandingC({
  angle,
  showNav = false,
  variant = "flash",
}: {
  angle: Angle;
  showNav?: boolean;
  variant?: LandingVariant;
}) {
  return (
    <main style={{ fontFamily: SANS, color: INK }} className="bg-white">
      <Header showNav={showNav} />
      {variant === "vsl" ? <HeroVsl angle={angle} /> : <HeroFlash angle={angle} />}
      <StatChips />
      {variant === "vsl" && <DiagnosticSection angle={angle} />}
      <Method />
      <Atarhib />
      <SocialProof />
      <PricingCta />
      <Footer />
      <MetaViewContent contentName={`lp_${angle}_${variant}`} />
    </main>
  );
}
