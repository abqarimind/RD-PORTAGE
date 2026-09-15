"use client";

/**
 * Étape 4 — Résultats.
 *
 * Trois garanties structurelles :
 *
 * §4.2 — INVARIANT ANTI-ZÉRO. Si les entrées ne permettent pas un calcul
 * crédible, l'écran n'affiche AUCUN chiffre : il dit ce qui manque et ramène
 * à l'étape concernée. Il n'existe plus de chemin vers un « 0 € » muet.
 *
 * BUG-02 — l'écart est rendu signé. Un écart négatif (micro-entreprise plus
 * favorable à revenu égal) est annoncé pour ce qu'il est, avec ce que le
 * portage apporte en contrepartie, au lieu d'être écrêté à 0 €.
 *
 * §4.4 — « Modifier ma simulation » ramène à l'étape voulue AVEC les valeurs
 * conservées ; « Nouvelle simulation » repart d'un état vide (BUG-03).
 */
import { BAREME_IR_2026, CAGNOTTE_PROVIDERS, RD_PORTAGE_2026 } from "@/config/fiscal-2026";
import type { ScenarioResult } from "@/lib/fiscal/scenarios";
import { activeBracket } from "@/lib/simulateur/state";
import { useSimulator } from "@/lib/simulateur/store";
import { useSimulation } from "@/lib/simulateur/useSimulation";
import { trackEvent } from "@/lib/tracking/events";
import { CountUp } from "@/components/lp/CountUp";
import { ALERTE, BRASS, eur, GHOST_BTN, OUTLINE_BTN, PRIMARY_BTN, pct, VALIDE } from "../ui";

const RDV_URL = process.env.NEXT_PUBLIC_RDV_URL ?? "tel:+33632988723";

export function ResultatsStep({ onRdv }: { onRdv: (from: string) => void }) {
  const { state, goTo, reset } = useSimulator();
  const { form } = state;
  const { result, live, missing, avantages } = useSimulation();

  /* ————— §4.2 : état explicite, jamais un chiffre vide ————— */
  if (missing.length > 0 || !result) {
    return (
      <section>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BRASS }}>
          Calcul impossible
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">
          Il manque une information pour calculer votre résultat
        </h1>
        <ul className="mt-4 space-y-3">
          {missing.map((m) => (
            <li key={m.message} className="rounded-2xl border border-[#F0D9D6] bg-[#FDF6F5] p-4">
              <p className="text-base font-semibold" style={{ color: ALERTE }}>
                {m.message}
              </p>
              <button type="button" className={`${OUTLINE_BTN} mt-3`} onClick={() => goTo(m.step)}>
                {m.cta}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-[#7A8093]">Vos autres réponses sont conservées — rien à ressaisir.</p>
      </section>
    );
  }

  const [actuel, portage, optimise] = result.scenarios;
  const ecart = result.economieAnnuelleEur;
  const enGain = ecart > 0;

  return (
    <section>
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BRASS }}>
        Votre résultat
      </p>
      <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
        Votre vrai taux d&rsquo;imposition du foyer :{" "}
        <span style={{ color: VALIDE }}>{pct(optimise.averageTaxRate)}</span>
      </h1>

      {/* L'écart, signé, avec une lecture honnête dans les deux sens. */}
      {enGain ? (
        <p className="mt-3 text-lg text-[#4A5061]">
          Vous laissez{" "}
          <span className="text-2xl font-extrabold tabular-nums" style={{ color: VALIDE }}>
            <CountUp value={ecart} /> €
          </span>{" "}
          par an sur la table.
        </p>
      ) : ecart < 0 ? (
        <div className="mt-3 rounded-2xl border border-[#ECEEF3] bg-[#FAFBFD] p-4">
          <p className="text-lg text-[#4A5061]">
            À revenu égal, votre statut actuel vous laisse{" "}
            <span className="text-2xl font-extrabold tabular-nums text-[#0B0D12]">{eur(Math.abs(ecart))} €</span> de plus par an que
            le portage optimisé.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#7A8093]">
            C&rsquo;est le chiffre réel, sans arrondi à l&rsquo;avantage du portage. Ce que le portage apporte en contrepartie ne se
            lit pas sur cette ligne : statut de salarié, assurance chômage, retraite et prévoyance, congés payés, et la sécurité
            juridique d&rsquo;un contrat de travail. À vous de peser les deux.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-lg text-[#4A5061]">
          À revenu égal, votre statut actuel et le portage optimisé vous laissent le même disponible annuel.
        </p>
      )}

      <p className="mt-1 text-sm tabular-nums text-[#7A8093]">
        Tranche marginale (TMI) : {(optimise.marginalRate * 100).toFixed(0)} % · écart entre votre statut actuel et le portage RD
        optimisé.
      </p>

      {form.tjmMode === "fourchette" && (
        <p className="mt-2 text-sm text-[#7A8093]">
          Calcul basé sur la fourchette <strong>{activeBracket(form).label}</strong> (médiane {eur(activeBracket(form).mediane)} €).{" "}
          <button type="button" className="font-semibold text-[#0B0D12] underline underline-offset-2" onClick={() => goTo("activite")}>
            Saisir mon TJM exact
          </button>
        </p>
      )}

      <ScenarioTable rows={[actuel, portage, optimise]} />
      <CommentCalcule live={live} optimise={optimise} avantagesInclus={avantages.avantagesInclus} cagnotte={form.cagnotte} />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" className={PRIMARY_BTN} onClick={() => goTo("inscription")}>
          Recevoir mon dossier complet
        </button>
        <a href={RDV_URL} onClick={() => onRdv("sim_result")} className={OUTLINE_BTN}>
          Valider ce chiffre — appeler Ridha
        </a>
      </div>

      {/* §4.4 — reprise et réinitialisation, explicites toutes les deux. */}
      <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-[#ECEEF3] pt-5">
        <button type="button" className={GHOST_BTN} onClick={() => goTo("activite")}>
          Modifier ma simulation
        </button>
        <button
          type="button"
          className={GHOST_BTN}
          onClick={() => {
            trackEvent("sim_restarted");
            reset();
          }}
        >
          Nouvelle simulation
        </button>
      </div>
    </section>
  );
}

function ScenarioTable({ rows }: { rows: ScenarioResult[] }) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b-2 text-xs uppercase tracking-wide text-[#7A8093]" style={{ borderColor: BRASS }}>
            <th className="py-2 pr-2 font-bold">Scénario</th>
            <th className="py-2 pr-2 font-bold">Net perçu</th>
            <th className="py-2 pr-2 font-bold">Avantages</th>
            <th className="py-2 pr-2 font-bold">Impôt foyer</th>
            <th className="py-2 font-bold">Dispo / an</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((s) => {
            const best = s.id === "portage_rd_optimise";
            return (
              <tr
                key={s.id}
                className="border-b border-[#ECEEF3]"
                style={best ? { color: VALIDE, fontWeight: 700 } : { color: "#4A5061" }}
              >
                <td className="py-3 pr-2">{s.label}</td>
                <td className="py-3 pr-2">{eur(s.netPerceived)} €</td>
                <td className="py-3 pr-2">{eur(s.benefits)} €</td>
                <td className="py-3 pr-2">−{eur(s.tax)} €</td>
                <td className="py-3">{eur(s.disposable)} €</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CommentCalcule({
  live,
  optimise,
  avantagesInclus,
  cagnotte,
}: {
  live: ReturnType<typeof useSimulation>["live"];
  optimise: { averageTaxRate: number; marginalRate: number };
  avantagesInclus: boolean;
  cagnotte: string;
}) {
  const lines: [string, string][] = [
    ["CA HT mensuel", `${eur(live.fees)} €`],
    [`Frais de gestion RD (${(RD_PORTAGE_2026.managementFeeRate * 100).toFixed(0)} %)`, `−${eur(live.managementFee)} €`],
    ["Assurances & taxes (0,9 %)", `−${eur(live.insuranceTax)} €`],
    ["NDF professionnels", `−${eur(live.ndf)} €`],
    ["Cagnotte", `−${eur(live.cagnotteMay)} €`],
    ["Disponible compte d'activité", `${eur(live.available)} €`],
    ["Salaire brut", `${eur(live.grossSalary)} €`],
    ["Cotisations salariales (21,5 %)", `−${eur(live.employeeContributions)} €`],
    ["Titres-restaurant", `+${eur(live.mealVoucherCredit)} €`],
    ["Perçu net + avantages (rém. globale)", `${eur(live.globalCompensation)} €`],
  ];
  return (
    <details className="mt-6 rounded-2xl border border-[#ECEEF3] bg-[#FAFBFD] p-4 text-sm">
      <summary className="min-h-[44px] cursor-pointer py-2 text-base font-bold text-[#0B0D12]">Comment c&rsquo;est calculé</summary>
      <div className="mt-3 grid gap-1 tabular-nums">
        {lines.map(([l, v]) => (
          <div key={l} className="flex justify-between border-b border-[#ECEEF3] py-1">
            <span className="text-[#7A8093]">{l}</span>
            <span className="font-semibold">{v}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between py-1">
          <span className="text-[#7A8093]">Taux de restitution réel</span>
          <span className="font-bold" style={{ color: VALIDE }}>
            {pct(live.restitutionRate)}
          </span>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[#7A8093]">
        IR foyer : barème progressif {BAREME_IR_2026.version.replace(/_/g, " ")}, quotient familial (plafonné à 1 807 €/demi-part),
        décote et abattement 10 % / frais réels appliqués. Taux moyen {pct(optimise.averageTaxRate)}, TMI{" "}
        {(optimise.marginalRate * 100).toFixed(0)} %.
      </p>
      <p className="mt-2 text-xs text-[#9aa0b0]">
        Sources : barème IR 2026 (service-public.gouv.fr), cascade portage (Excel RD « Simul Honoraires »), URSSAF / impots.gouv.fr.
        {avantagesInclus && cagnotte !== "aucune"
          ? ` Cagnotte ${CAGNOTTE_PROVIDERS[cagnotte as "may" | "wawashi"].label} affichée nette de frais.`
          : ""}
      </p>
    </details>
  );
}
