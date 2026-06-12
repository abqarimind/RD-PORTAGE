import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { computePortage } from "@/lib/fiscal/portage";

export const metadata: Metadata = {
  title: "Concept C — Variante UI fintech claire (prototype)",
  robots: { index: false, follow: false },
};

/**
 * CONCEPT C — light fintech-SaaS variant of the landing (BLUEPEAK-style
 * reference provided by the client): white background, pastel tinted cards,
 * pill buttons, bold sans headlines with a hand-drawn underline accent.
 * Deliberately departs from the "tribunal fiscal" brand lock — exploration
 * prototype for client review. Figures still come from the real engine.
 *
 * Image slots are marked with <ImageSlot> (dashed placeholder + spec) so
 * assets can be sourced/generated later. Kept to a strict minimum.
 */

const REF = computePortage({ tjm: 420, days: 20, ndf: 500, cagnotteMay: 1570, mealVouchers: true });
const REF_RAW = computePortage({ tjm: 420, days: 20 });
const YEARLY_GAP = Math.round((REF.globalCompensation - REF_RAW.netSalary) * 12);
const PCT = Math.round(REF.restitutionRate * 100);
const eur = (n: number) => n.toLocaleString("fr-FR");

/* Pastel tints, BLUEPEAK-style. */
const PEACH = "#FFF1DE";
const LILAC = "#EFF0FB";
const MINT = "#E7F6EE";
const INK = "#0B0D12";

function ImageSlot({ label, ratio = "aspect-[4/3]", className = "" }: { label: string; ratio?: string; className?: string }) {
  return (
    <div
      className={`flex ${ratio} w-full items-center justify-center rounded-2xl border-2 border-dashed border-[#C9CEDA] bg-[#F6F7FA] p-4 text-center ${className}`}
    >
      <p className="text-xs font-medium leading-relaxed text-[#7A8093]">Image à fournir — {label}</p>
    </div>
  );
}

function Pill({ children, dark = false, href = "/simulateur" }: { children: React.ReactNode; dark?: boolean; href?: string }) {
  return (
    <Link
      href={href}
      className={`inline-block rounded-full px-6 py-3 text-sm font-bold transition hover:opacity-85 ${
        dark ? "bg-[#0B0D12] text-white" : "border border-[#D8DCE6] bg-white text-[#0B0D12]"
      }`}
    >
      {children}
    </Link>
  );
}

/* Hand-drawn underline accent (brass — the one brand survivor). */
function Scribble() {
  return (
    <svg viewBox="0 0 220 14" className="absolute -bottom-2 left-0 w-full" aria-hidden>
      <path d="M4 9 C 60 2, 150 2, 216 7" fill="none" stroke="#B08D57" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export default function ConceptCPage() {
  return (
    <main style={{ fontFamily: "'Manrope','IBM Plex Sans',sans-serif", color: INK }} className="bg-white">
      {/* Prototype banner */}
      <div className="border-b border-[#ECEEF3] bg-white">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-[#7A8093]">
          <p><span className="font-bold text-[#B08D57]">Prototype interne</span> — Concept C, variante UI fintech claire</p>
          <p>
            <Link href="/concept-a" className="underline">Concept A</Link>{" · "}
            <Link href="/concept-b" className="underline">Concept B</Link>{" · "}
            <Link href="/" className="underline">Landing actuelle</Link>
          </p>
        </div>
      </div>

      {/* ——— NAV ——— */}
      <header className="mx-auto flex max-w-page items-center justify-between px-4 py-5">
        <p className="text-lg font-extrabold tracking-tight">RD&nbsp;Portage</p>
        <nav className="hidden gap-8 text-sm font-medium text-[#4A5061] md:flex">
          <Link href="/simulateur" className="hover:text-[#0B0D12]">Simulateur</Link>
          <a href="#methode" className="hover:text-[#0B0D12]">Méthode</a>
          <a href="#preuves" className="hover:text-[#0B0D12]">Preuves</a>
          <a href="#tarif" className="hover:text-[#0B0D12]">Tarif</a>
        </nav>
        <Pill href="tel:+33632988723">Diagnostic 30 min</Pill>
      </header>

      {/* ——— HERO ——— */}
      <section className="mx-auto max-w-page px-4 pb-16 pt-10 text-center md:pt-16">
        {/* Locked promise, restyled — wording untouched. */}
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          Vous payez{" "}
          <span className="relative inline-block">
            trop d&rsquo;impôts
            <Scribble />
          </span>{" "}
          sans le savoir.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-[#4A5061] md:text-lg">
          Calculez votre meilleur taux d&rsquo;imposition en 2 à 3 minutes. Gratuit, sans engagement.
          Portage salarial 100&nbsp;% légal, chaque euro tracé.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
          <Pill dark>Calculer mon taux</Pill>
          <div className="flex items-center gap-2">
            <ImageSlot label="3 ou 4 portraits ronds de consultants (cluster d'avatars, 40 px)" ratio="aspect-auto h-10 w-28" className="!rounded-full !p-1" />
            <p className="text-left text-xs font-semibold leading-tight text-[#4A5061]">~30 consultants<br />portés depuis 2021</p>
          </div>
        </div>

        {/* ——— Mockup cards (CSS-built, no assets needed) ——— */}
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {/* Card 1 — phone mockup, peach tint */}
          <div className="rounded-3xl p-6 md:p-8" style={{ backgroundColor: PEACH }}>
            <div className="mx-auto max-w-[270px] rounded-[28px] border-8 border-[#0B0D12] bg-white p-4 text-left shadow-xl">
              <div className="flex items-center justify-between text-[10px] font-bold text-[#7A8093]">
                <span>9:41</span><span>Votre simulation</span>
              </div>
              <p className="mt-4 text-[11px] font-semibold text-[#7A8093]">Rémunération globale / mois</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums">{eur(REF.globalCompensation)} €</p>
              <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: MINT, color: "#2F6B4F" }}>
                {PCT} % du CA restitué
              </span>
              <div className="mt-4 space-y-2 text-[11px] font-medium">
                {[
                  ["Salaire net", `${eur(REF.netSalary)} €`],
                  ["Frais remboursés", `${eur(REF.ndf)} €`],
                  ["Avantages May", `${eur(REF.cagnotteMay)} €`],
                  ["Frais de gestion (4 %)", `− ${eur(REF.managementFee)} €`],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between rounded-xl bg-[#F6F7FA] px-3 py-2">
                    <span className="text-[#4A5061]">{l}</span><span className="tabular-nums font-bold">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 text-xs font-semibold text-[#8A6B3F]">Cas de référence TJM 420 € — calculé par notre moteur, pas par le marketing.</p>
          </div>

          {/* Card 2 — scenario chart, lilac tint */}
          <div className="flex flex-col rounded-3xl p-6 text-left md:p-8" style={{ backgroundColor: LILAC }}>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Vos 3 scénarios</p>
                <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: MINT, color: "#2F6B4F" }}>
                  + {eur(YEARLY_GAP)} €/an
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ["Statut actuel", 51, "#C9CEDA"],
                  ["Portage classique", 49, "#C9CEDA"],
                  ["RD Portage optimisé", PCT, "#B08D57"],
                ].map(([label, value, color]) => (
                  <div key={label as string}>
                    <div className="flex justify-between text-[11px] font-semibold text-[#4A5061]">
                      <span>{label}</span><span className="tabular-nums">{value} € / 100 € facturés</span>
                    </div>
                    <div className="mt-1 h-2.5 w-full rounded-full bg-[#F0F1F5]">
                      <div className="h-2.5 rounded-full" style={{ width: `${value}%`, backgroundColor: color as string }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-auto pt-4 text-xs font-semibold text-[#4A5061]">
              Le seul simulateur qui calcule le taux d&rsquo;imposition réel de votre foyer : enfants, garde alternée, frais réels, PER, impatrié.
            </p>
          </div>
        </div>

        {/* Stat chips */}
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["4 %", "frais de gestion, tout compris"],
            ["64 %", "du CA restitué (cas de référence)"],
            ["2021", "création — RCS Versailles"],
            ["18 000 €", "d'avantages légaux possibles / an"],
          ].map(([big, small]) => (
            <div key={big} className="rounded-2xl border border-[#ECEEF3] bg-white px-4 py-4">
              <p className="text-2xl font-extrabold tabular-nums">{big}</p>
              <p className="mt-1 text-xs font-medium text-[#7A8093]">{small}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ——— FEATURES (3 cards) ——— */}
      <section id="methode" className="mx-auto max-w-page px-4 py-16">
        <h2 className="mx-auto max-w-2xl text-center text-3xl font-extrabold tracking-tight md:text-4xl">
          Trois étapes, zéro zone grise
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-[#4A5061]">
          De la première estimation à la signature : un parcours pensé pour que vous sachiez toujours où va chaque euro.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            [PEACH, "Diagnostic flash", "3 questions, 30 secondes : une première fourchette de ce que vous laissez sur la table chaque année."],
            [LILAC, "Simulateur foyer", "2-3 minutes pour le calcul complet : situation familiale, frais réels, PER, dispositifs légaux — plafonds inclus."],
            [MINT, "Diagnostic 30 min", "Vous validez votre chiffre avec Ridha, le fondateur (ex-porté). Proposition ferme, signature possible sous 48 h."],
          ].map(([tint, title, body], i) => (
            <div key={title as string} className="rounded-3xl border border-[#ECEEF3] bg-white p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-extrabold" style={{ backgroundColor: tint as string }}>
                {i + 1}
              </div>
              <p className="mt-4 text-lg font-bold">{title}</p>
              <p className="mt-2 text-sm leading-relaxed text-[#4A5061]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ——— EDITORIAL SPLIT — transparency + founder ——— */}
      <section id="preuves" className="mx-auto max-w-page px-4 py-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              Depuis 2024, un montage opaque se paie sur <span className="relative inline-block">votre<Scribble /></span> paie.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#4A5061]">
              En cas de redressement URSSAF, la régularisation s&rsquo;impute sur la rémunération du porté — jusqu&rsquo;à 3 ans en
              arrière. Cash en main, CPF détourné, facturation offshore : l&rsquo;avantage est immédiat, le risque est pour vous.
              Notre réponse : un cadre 100&nbsp;% légal où l&rsquo;optimisation vient des dispositifs officiels, pas des angles morts.
            </p>
            <div className="mt-6 flex items-center gap-4 rounded-2xl border border-[#ECEEF3] bg-white p-4">
              <Image src="/ridha.png" alt="Ridha Chammam" width={56} height={56} className="rounded-full" />
              <div>
                <p className="text-sm font-bold">« J&rsquo;ai moi-même été consultant porté. »</p>
                <p className="text-xs text-[#7A8093]">Ridha Chammam — fondateur de RD Portage, Founder &amp; CEO RIDCHA DATA</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[["3 ans", "de rappel possible"], ["×4", "le coût d'un indu redressé"], ["0", "montage gris chez RD"]].map(([b, s]) => (
                <div key={b} className="rounded-2xl px-4 py-3" style={{ backgroundColor: LILAC }}>
                  <p className="text-xl font-extrabold tabular-nums">{b}</p>
                  <p className="text-[11px] font-medium text-[#4A5061]">{s}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <ImageSlot label="photo d'un consultant en situation de travail, lumineuse, cadrage 4:3 (pas de stock souriant générique)" />
            <div className="rounded-3xl p-5" style={{ backgroundColor: MINT }}>
              <p className="text-sm font-bold" style={{ color: "#2F6B4F" }}>Garde-fous intégrés</p>
              <p className="mt-1 text-xs leading-relaxed text-[#2F6B4F]">
                Frais plafonnés à 30 % du CA, avantages dans les plafonds URSSAF, chaque chiffre du site sourcé ou retiré.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ——— TRUST + TESTIMONIALS ——— */}
      <section className="border-y border-[#ECEEF3] bg-[#FAFBFD]">
        <div className="mx-auto max-w-page px-4 py-14">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-[#7A8093]">Ils font confiance à nos consultants</p>
          <div className="mt-5">
            <ImageSlot label="4 à 6 logos de clients finaux / partenaires (monochromes, hauteur 28 px)" ratio="aspect-auto h-16" />
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {[
              ["Le simulateur m'a donné le vrai chiffre, foyer compris — personne d'autre ne le calcule. Signature en 48 h, comme annoncé.", "Consultant data, ex-ESN — témoignage à recueillir"],
              ["Je viens d'un portage à 8 % sans aucune optimisation. La différence est exactement celle annoncée par la simulation.", "Consultante SAP — témoignage à recueillir"],
            ].map(([quote, who]) => (
              <figure key={who} className="rounded-3xl border border-[#ECEEF3] bg-white p-6">
                <p className="text-sm font-bold text-[#B08D57]">★★★★★</p>
                <blockquote className="mt-3 text-sm leading-relaxed text-[#4A5061]">« {quote} »</blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <ImageSlot label="portrait rond 48 px" ratio="aspect-square h-12 w-12" className="!rounded-full !p-1" />
                  <p className="text-xs font-semibold">{who}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ——— PRICING / FINAL CTA ——— */}
      <section id="tarif" className="mx-auto max-w-page px-4 py-16 text-center">
        <div className="rounded-3xl px-6 py-12 md:py-16" style={{ backgroundColor: PEACH }}>
          <p className="text-xs font-bold uppercase tracking-widest text-[#8A6B3F]">Un seul tarif, tout compris</p>
          <p className="mt-3 text-5xl font-extrabold tabular-nums">4 %</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#4A5061]">
            de frais de gestion. 400 € pour 10 000 € de CA porté — sans ligne cachée en bas de page.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <Pill dark>Calculer mon taux — 2 à 3 min</Pill>
            <Pill href="tel:+33632988723">Appeler Ridha — 06 32 98 87 23</Pill>
          </div>
        </div>
      </section>

      {/* ——— FOOTER ——— */}
      <footer className="border-t border-[#ECEEF3]">
        <div className="mx-auto max-w-page px-4 py-8 text-xs leading-relaxed text-[#7A8093]">
          <p>RD Portage — 1 rue George Stephenson, 78180 Montigny-le-Bretonneux · RCS Versailles 912 888 013 · +33 1 71 49 71 57</p>
          <p className="mt-1">
            <Link href="/mentions-legales" className="underline">Mentions légales</Link>{" · "}
            <Link href="/confidentialite" className="underline">Confidentialité</Link>{" · "}
            Simulation à valeur indicative — ne constitue pas un conseil fiscal personnalisé.
          </p>
        </div>
      </footer>
    </main>
  );
}
