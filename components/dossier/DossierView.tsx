"use client";

/**
 * LE DOSSIER — l'artefact visuel remis à l'utilisateur.
 *
 * Il remplace l'ancien « Télécharger le dossier » (window.print(), sans
 * aucune génération de document, ignoré par Safari iOS — BUG-06). Une page
 * web n'a rien à télécharger, rien qui puisse être bloqué par un navigateur
 * ou un bloqueur de pop-up, et le même lien fonctionne sur tous les
 * appareils depuis l'email.
 *
 * Elle consomme le contrat de données (types/simulation-result.ts) et rien
 * d'autre : le design définitif pourra être refait sans toucher au calcul.
 * L'impression navigateur reste offerte en complément, jamais comme seul
 * moyen d'accès.
 */
import { useEffect, useRef } from "react";
import type { SimulationResultPayload } from "@/types/simulation-result";
import { Cascade, RestitutionGauge, ScenarioBars, type CascadeStep } from "./charts";
import { HeroAccent } from "./HeroAccent";

const BRASS = "#B08D57";
const VALIDE = "#2F6B4F";
const SANS = "'Manrope','IBM Plex Sans',sans-serif";

const eur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const pct = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")} %`;

export function DossierView({ payload }: { payload: SimulationResultPayload }) {
  const root = useRef<HTMLDivElement>(null);

  /* Révélations GSAP — chargées à la demande, sans jamais retarder le contenu. */
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let ctx: { revert: () => void } | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { gsap } = await import("gsap");
        if (cancelled) return;
        ctx = gsap.context(() => {
          gsap.from("[data-reveal]", {
            opacity: 0,
            y: 16,
            duration: 0.5,
            ease: "power2.out",
            stagger: 0.07,
            clearProps: "all",
          });
        }, el);
      } catch {
        /* sans GSAP, le dossier s'affiche simplement sans animation */
      }
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  const r = payload.resultats;
  const m = r.mensuel;
  const [actuel, portage, optimise] = r.scenarios;

  const cascade: CascadeStep[] = [
    { label: "CA HT", delta: m.caHt, total: true },
    { label: "Frais de gestion", delta: -m.fraisDeGestion },
    { label: "Assurances & taxes", delta: -m.assurancesTaxes },
    ...(m.fraisPro > 0 ? [{ label: "Frais professionnels", delta: -m.fraisPro }] : []),
    ...(m.cagnotte > 0 ? [{ label: "Cagnotte avantages", delta: -m.cagnotte }] : []),
    { label: "Disponible", delta: m.disponible, total: true },
    { label: "Charges patronales", delta: -(m.disponible - m.brut) },
    { label: "Cotisations salariales", delta: -m.cotisationsSalariales },
    ...(payload.avantages.titresResto.inclus ? [{ label: "Titres-restaurant", delta: m.titresResto }] : []),
    { label: "Perçu net", delta: m.percuNet, total: true },
  ];

  return (
    <div ref={root} className="mx-auto max-w-3xl px-4 py-10" style={{ fontFamily: SANS, color: "#0B0D12" }}>
      {/* —————————————— en-tête —————————————— */}
      <header className="relative" data-reveal>
        <HeroAccent />
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BRASS }}>
          Votre dossier — {payload.meta.dateSimulationLabel}
        </p>
        <h1 className="mt-2 max-w-xl text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
          {payload.identite.prenom
            ? `Bonjour ${payload.identite.prenom}, voici ce que devient votre chiffre d'affaires.`
            : "Voici ce que devient votre chiffre d'affaires."}
        </h1>
        <p className="mt-2 max-w-xl text-base text-[#4A5061]">
          {payload.identite.profilLabel} ·{" "}
          {payload.activite.tjmMode === "fourchette" && payload.activite.tjmFourchette
            ? `fourchette ${payload.activite.tjmFourchette.label} (calcul sur ${eur(payload.activite.tjmFourchette.mediane)})`
            : `TJM ${eur(payload.activite.tjm)}`}{" "}
          · {payload.activite.joursFactures} jours facturés par mois
        </p>
      </header>

      {/* —————————————— chiffres d'accroche (tuiles, pas graphiques) —————————————— */}
      <section className="mt-8 grid gap-3 sm:grid-cols-3" data-reveal>
        <StatTile label="Perçu net" value={eur(m.percuNet)} sub="par mois" accent />
        <StatTile label="Rémunération globale" value={eur(m.remunerationGlobale)} sub="net + avantages, par mois" />
        <StatTile label="Votre vrai taux d'imposition" value={pct(r.tauxMoyenImposition)} sub={`TMI ${(r.tmi * 100).toFixed(0)} %`} />
      </section>

      {/* —————————————— taux de restitution —————————————— */}
      <section className="mt-10 rounded-3xl border border-[#ECEEF3] bg-white p-6" data-reveal>
        <h2 className="text-lg font-extrabold tracking-tight">Ce qui vous revient réellement</h2>
        <p className="mt-1 text-sm text-[#7A8093]">
          Sur {eur(m.caHt)} facturés chaque mois, voici la part qui finit dans votre poche, avantages compris.
        </p>
        <div className="mt-5">
          <RestitutionGauge rate={r.tauxRestitution} />
        </div>
      </section>

      {/* —————————————— cascade —————————————— */}
      <section className="mt-6 rounded-3xl border border-[#ECEEF3] bg-white p-6" data-reveal>
        <h2 className="text-lg font-extrabold tracking-tight">Du chiffre d&rsquo;affaires au net perçu</h2>
        <p className="mt-1 text-sm text-[#7A8093]">Chaque étape, en euros, pour un mois type. Rien n&rsquo;est arrondi en votre faveur.</p>
        <Cascade steps={cascade} />
      </section>

      {/* —————————————— avantages —————————————— */}
      <section className="mt-6 rounded-3xl border border-[#ECEEF3] bg-white p-6" data-reveal>
        <h2 className="text-lg font-extrabold tracking-tight">Vos avantages</h2>
        {payload.avantages.avantagesInclus ? (
          <>
            <p className="mt-1 text-sm text-[#7A8093]">Montants nets de frais de service — c&rsquo;est ce que vous recevez vraiment.</p>
            <div className="mt-4 space-y-2">
              {payload.avantages.selection.map((a) => (
                <div key={a.id} className="flex items-baseline justify-between gap-3 border-b border-[#ECEEF3] py-2">
                  <span className="text-sm">
                    <strong>{a.label}</strong> <span className="text-[#9aa0b0]">({a.fraisDeService})</span>
                  </span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: VALIDE }}>
                    {eur(a.montantNetMensuel)} / mois
                  </span>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-3 pt-2">
                <span className="text-sm font-bold">Total sur l&rsquo;année</span>
                <span className="text-lg font-extrabold tabular-nums" style={{ color: VALIDE }}>
                  {eur(payload.avantages.totalNetAnnuel)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-[#4A5061]">
            Vous n&rsquo;avez retenu aucun avantage. Les montants de ce dossier sont calculés sans eux.
          </p>
        )}
      </section>

      {/* —————————————— scénarios —————————————— */}
      <section className="mt-6 rounded-3xl border border-[#ECEEF3] bg-white p-6" data-reveal>
        <h2 className="text-lg font-extrabold tracking-tight">Disponible annuel, selon le statut</h2>
        <ScenarioBars
          rows={[
            { label: actuel.label, value: actuel.disponible },
            { label: portage.label, value: portage.disponible },
            { label: optimise.label, value: optimise.disponible, best: optimise.disponible >= actuel.disponible },
          ]}
        />
        <div className="mt-5 rounded-2xl p-4" style={{ backgroundColor: r.laisseSurLaTableSens === "gain" ? "#E7F6EE" : "#FAFBFD" }}>
          {r.laisseSurLaTableSens === "gain" ? (
            <p className="text-base">
              En passant au portage RD optimisé, vous récupérez{" "}
              <strong className="tabular-nums" style={{ color: VALIDE }}>
                {eur(Math.abs(r.laisseSurLaTable))}
              </strong>{" "}
              de plus par an.
            </p>
          ) : r.laisseSurLaTable < 0 ? (
            <>
              <p className="text-base">
                À revenu égal, votre statut actuel vous laisse{" "}
                <strong className="tabular-nums">{eur(Math.abs(r.laisseSurLaTable))}</strong> de plus par an que le portage optimisé.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#7A8093]">
                Ce chiffre est donné sans arrondi à l&rsquo;avantage du portage. Ce qu&rsquo;il ne dit pas : en portage vous êtes
                salarié — assurance chômage, retraite, prévoyance, congés payés et la sécurité juridique d&rsquo;un contrat de
                travail. C&rsquo;est l&rsquo;arbitrage à faire, et il n&rsquo;est pas seulement financier.
              </p>
            </>
          ) : (
            <p className="text-base">À revenu égal, les deux statuts vous laissent le même disponible annuel.</p>
          )}
        </div>
      </section>

      {/* —————————————— foyer & impôt —————————————— */}
      <section className="mt-6 rounded-3xl border border-[#ECEEF3] bg-white p-6" data-reveal>
        <h2 className="text-lg font-extrabold tracking-tight">Votre foyer et votre impôt</h2>
        <dl className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
          <Line label="Situation" value={payload.foyer.situationLabel} />
          <Line label="Parts fiscales" value={String(payload.foyer.nombreDeParts)} />
          <Line
            label="Enfants à charge"
            value={`${payload.foyer.enfants}${
              payload.foyer.enfantsGardeAlternee > 0 ? ` (dont ${payload.foyer.enfantsGardeAlternee} en garde alternée)` : ""
            }`}
          />
          <Line label="Mode de déduction" value={payload.foyer.modeDeductionLabel} />
          {payload.foyer.revenuConjoint > 0 && <Line label="Revenu du conjoint" value={`${eur(payload.foyer.revenuConjoint)} / an`} />}
          {payload.foyer.fraisReelsAnnuels > 0 && <Line label="Frais réels" value={`${eur(payload.foyer.fraisReelsAnnuels)} / an`} />}
          {payload.foyer.per > 0 && <Line label="Versements PER" value={`${eur(payload.foyer.per)} / an`} />}
          {payload.foyer.autresRevenus.foncier > 0 && (
            <Line label="Revenus fonciers" value={`${eur(payload.foyer.autresRevenus.foncier)} / an`} />
          )}
          {payload.foyer.autresRevenus.dons > 0 && <Line label="Dons" value={`${eur(payload.foyer.autresRevenus.dons)} / an`} />}
          <Line label="Net imposable annuel" value={eur(r.netImposableAnnuel)} />
          <Line label="Impôt net" value={eur(r.impotNet)} />
        </dl>
      </section>

      {/* —————————————— suite —————————————— */}
      <section className="mt-6 rounded-3xl p-6" style={{ backgroundColor: "#FFF1DE" }} data-reveal>
        <h2 className="text-lg font-extrabold tracking-tight">La suite</h2>
        <p className="mt-2 text-base text-[#4A5061]">
          Ce dossier est une estimation calculée sur vos réponses. Pour le transformer en proposition ferme, Ridha le reprend
          avec vous en 30 minutes.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={process.env.NEXT_PUBLIC_RDV_URL ?? "tel:+33632988723"}
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#0B0D12] px-6 py-3 text-base font-bold text-white"
          >
            Valider mon chiffre — Diagnostic 30 min
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#D8DCE6] bg-white px-6 py-3 text-base font-bold text-[#0B0D12]"
          >
            Imprimer ce dossier
          </button>
        </div>
      </section>

      <footer className="mt-8 text-xs leading-relaxed text-[#9aa0b0]">
        <p>{payload.meta.mentions.valeurIndicative}</p>
        <p className="mt-1">
          Référence de simulation : {payload.meta.simulationId} ·{" "}
          <a href={payload.meta.mentions.mentionsLegalesUrl} className="underline">
            Mentions légales
          </a>{" "}
          ·{" "}
          <a href={payload.meta.mentions.politiqueConfidentialiteUrl} className="underline">
            Confidentialité
          </a>
        </p>
      </footer>
    </div>
  );
}

function StatTile({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: accent ? "transparent" : "#ECEEF3", backgroundColor: accent ? "#E7F6EE" : "#fff" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[#7A8093]">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums" style={{ color: accent ? VALIDE : "#0B0D12" }}>
        {value}
      </p>
      <p className="text-xs text-[#9aa0b0]">{sub}</p>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[#ECEEF3] py-1.5">
      <dt className="text-sm text-[#7A8093]">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
