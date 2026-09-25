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
import type { SimulationResultPayload } from "@/types/simulation-result";
import { buildCascadeSteps, buildPartage } from "@/lib/dossier/breakdown";
import { Cascade, PartageBar, RestitutionGauge, ScenarioBars } from "./charts";
import { groupFr } from "@/lib/format";
import { CTA_CONSEILLER, RDV_URL } from "@/config/contact";

const BRASS = "#B08D57";
const VALIDE = "#2F6B4F";
const SANS = "'Manrope','IBM Plex Sans',sans-serif";

const eur = (n: number) => `${groupFr(n)}\u00A0€`;
const pct = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")} %`;

export function DossierView({ payload }: { payload: SimulationResultPayload }) {
  const r = payload.resultats;
  const m = r.mensuel;
  const [actuel, portage, optimise] = r.scenarios;

  const cascade = buildCascadeSteps(payload);
  const { parts: partage, hint: hintPartage } = buildPartage(payload);

  return (
    <div className="mx-auto max-w-reading px-4 py-10" style={{ fontFamily: SANS, color: "#0B0D12" }}>
      {/* —————————————— en-tête —————————————— */}
      <header data-reveal>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BRASS }}>
          Votre dossier — {payload.meta.dateSimulationLabel}
        </p>
        <h1 className="mt-2 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
          {payload.identite.prenom
            ? `Bonjour ${payload.identite.prenom}, voici ce que devient votre chiffre d'affaires.`
            : "Voici ce que devient votre chiffre d'affaires."}
        </h1>
        <p className="mt-2 text-base text-[#4A5061]">
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
          Sur {eur(m.caHt)} facturés chaque mois, voici la part qui vous revient avant impôt sur le revenu, avantages compris.
        </p>
        <div className="mt-5">
          <RestitutionGauge rate={r.tauxRestitution} benefitsRate={r.tauxAvantages} />
        </div>
      </section>

      {/* ——————— où va le CA : la lecture à une seconde, puis le détail ——————— */}
      <section className="mt-6 rounded-3xl border border-[#ECEEF3] bg-white p-6" data-reveal>
        <h2 className="text-lg font-extrabold tracking-tight">Où vont vos {eur(m.caHt)} ?</h2>
        <p className="mt-1 text-sm text-[#7A8093]">Trois blocs, pour un mois type.</p>
        <PartageBar total={m.caHt} parts={partage} hint={hintPartage} />

        <div className="mt-8 border-t border-[#ECEEF3] pt-6">
          <h3 className="text-base font-extrabold tracking-tight">Le détail, étape par étape</h3>
          <p className="mt-1 text-sm text-[#7A8093]">
            Du chiffre d&rsquo;affaires au net perçu. Rien n&rsquo;est arrondi en votre faveur.
          </p>
          <Cascade steps={cascade} />
        </div>
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
      {/* Masqué pour un profil sans situation actuelle : le champ vient du
          contrat de données, aucun écran ne décide seul (§4.3). */}
      {r.comparable && (
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
      )}

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
          Ce dossier est une estimation calculée sur vos réponses. Pour le transformer en proposition ferme, votre conseiller
          le reprend avec vous en 30 minutes.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={RDV_URL}
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#0B0D12] px-6 py-3 text-base font-bold text-white"
          >
            {CTA_CONSEILLER}
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

      <RevealStyles />

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

/**
 * Révélation à l'arrivée, en CSS.
 *
 * Elle remplace une animation GSAP chargée par import différé : celle-ci
 * s'exécutant APRÈS le premier rendu, le contenu s'affichait puis disparaissait
 * pour réapparaître en fondu. Une animation CSS démarre au premier rendu, ne
 * dépend d'aucun script, et n'anime que opacity et transform — aucun
 * recalcul de mise en page, donc aucun décalage.
 */
function RevealStyles() {
  return (
    <style jsx global>{`
      @media (prefers-reduced-motion: no-preference) {
        [data-reveal] {
          animation: dossierReveal 500ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        [data-reveal]:nth-child(2) { animation-delay: 70ms; }
        [data-reveal]:nth-child(3) { animation-delay: 140ms; }
        [data-reveal]:nth-child(4) { animation-delay: 210ms; }
        [data-reveal]:nth-child(5) { animation-delay: 280ms; }
        [data-reveal]:nth-child(6) { animation-delay: 350ms; }
        [data-reveal]:nth-child(7) { animation-delay: 420ms; }
        [data-reveal]:nth-child(n + 8) { animation-delay: 490ms; }
      }
      @keyframes dossierReveal {
        from {
          opacity: 0;
          transform: translate3d(0, 16px, 0);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
    `}</style>
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
