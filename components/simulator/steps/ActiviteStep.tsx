"use client";

/**
 * Étape 2 — Activité, et choix des avantages.
 *
 * Deux corrections structurantes vivent ici :
 *
 * BUG-02 — le mode de saisie du TJM est un état explicite, mémorisé et
 * réversible. « Montant exact » et « Fourchette » coexistent en permanence :
 * l'utilisateur bascule de l'un à l'autre à tout moment, sans jamais perdre
 * l'autre saisie, et un retour arrière le ramène sur le mode qu'il utilisait.
 *
 * BUG-04 — la mention « avantages inclus » et l'aperçu chiffré descendent
 * tous deux de useSimulation(). Décocher un avantage met à jour le libellé
 * ET le montant, parce qu'ils lisent le même état.
 */
import { CAGNOTTE_PROVIDERS, type CagnotteChoice } from "@/config/fiscal-2026";
import { TJM_BRACKETS } from "@/lib/simulateur/brackets";
import { activeBracket } from "@/lib/simulateur/state";
import { useSimulator } from "@/lib/simulateur/store";
import { useSimulation } from "@/lib/simulateur/useSimulation";
import { trackEvent } from "@/lib/tracking/events";
import { CountUp } from "@/components/lp/CountUp";
import { AmountInput, BRASS, eur, Field, MINT, pct, PRIMARY_BTN, Screen, Segmented, VALIDE } from "../ui";

export function ActiviteStep() {
  const { state, dispatch, setField, goTo } = useSimulator();
  const { form } = state;
  const { live, avantages, tjm } = useSimulation();
  const bracket = activeBracket(form);

  return (
    <Screen
      title="Votre activité"
      subtitle={form.status === "salarie_esn" ? "Votre TJM cible en portage." : "Ce que vous facturez (ou visez)."}
    >
      {/* —————————— TJM : deux modes explicites, réversibles —————————— */}
      <Field label="TJM — tarif jour HT">
        {state.prefilled.tjm && (
          <p className="mb-2 rounded-xl px-3 py-2 text-sm" style={{ backgroundColor: "#FFF1DE" }}>
            Fourchette reprise de votre diagnostic. Affinez-la en montant exact si vous le connaissez.
          </p>
        )}
        <Segmented
          options={[
            { value: "exact", label: "Montant exact" },
            { value: "fourchette", label: "Fourchette" },
          ]}
          value={form.tjmMode}
          onChange={(v) => dispatch({ type: "set_tjm_mode", mode: v as "exact" | "fourchette" })}
        />

        {form.tjmMode === "exact" ? (
          <div className="mt-4">
            <AmountInput
              label="Votre TJM exact"
              hint="Saisissez le montant au clavier — le curseur n'est là que pour ajuster."
              value={form.tjmExact}
              min={150}
              max={2000}
              step={10}
              onChange={(v) => dispatch({ type: "set_tjm_exact", value: v })}
            />
          </div>
        ) : (
          <div className="mt-4">
            <div className="grid grid-cols-2 gap-2">
              {TJM_BRACKETS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  aria-pressed={form.tjmBracketId === b.id}
                  onClick={() => dispatch({ type: "set_tjm_bracket", id: b.id })}
                  className={`min-h-[48px] rounded-xl border px-3 py-3 text-sm font-semibold transition-[background-color,border-color,color,transform,box-shadow] duration-150 ${
                    form.tjmBracketId === b.id
                      ? "border-transparent bg-[#0B0D12] text-white"
                      : "border-[#E2E5EE] bg-white text-[#0B0D12] hover:border-[#B08D57]"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
            {/* La conversion est annoncée : jamais de fourchette qui ne calcule rien. */}
            <p className="mt-2 text-sm text-[#7A8093]">
              Calcul effectué sur la valeur médiane : <strong className="tabular-nums text-[#0B0D12]">{eur(bracket.mediane)} €</strong>.{" "}
              <button
                type="button"
                className="font-semibold text-[#0B0D12] underline underline-offset-2"
                onClick={() => dispatch({ type: "set_tjm_mode", mode: "exact" })}
              >
                Saisir mon TJM exact
              </button>
            </p>
          </div>
        )}
      </Field>

      <AmountInput
        label="Jours facturés par mois"
        value={form.days}
        min={1}
        max={23}
        suffix="j"
        onChange={(v) => setField("days", v)}
      />

      <AmountInput
        label="Frais professionnels mensuels"
        hint="Déplacements, matériel, télétravail… Limités à 30 % de votre salaire brut (règle interne RD Portage)."
        value={form.fraisMensuels}
        min={0}
        max={2000}
        step={50}
        onChange={(v) => setField("fraisMensuels", v)}
      />

      {/* —————————— Choix des avantages —————————— */}
      <Field
        label="Choix des avantages"
        hint="Enveloppe d'avantages exonérés (chèques cadeaux, services à la personne, mobilité, culture), dans les plafonds URSSAF. Toujours affichée nette de frais de service."
      >
        <Segmented
          columns={3}
          options={[
            { value: "may", label: "May" },
            { value: "wawashi", label: "Wawashi" },
            { value: "aucune", label: "Aucune" },
          ]}
          value={form.cagnotte}
          onChange={(v) => setField("cagnotte", v as CagnotteChoice)}
        />
        <label className="mt-3 flex min-h-[44px] items-center gap-3 text-base text-[#0B0D12]">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[#0B0D12]"
            checked={form.titresResto}
            onChange={(e) => setField("titresResto", e.target.checked)}
          />
          <span>Titres-restaurant</span>
        </label>

        {/* Récapitulatif dérivé : disparaît entièrement si rien n'est retenu. */}
        {avantages.avantagesInclus ? (
          <div className="mt-3 space-y-1">
            {avantages.selection.map((a) => (
              <p key={a.id} className="flex justify-between text-sm tabular-nums text-[#7A8093]">
                <span>
                  {a.label} <span className="text-xs">({a.fraisDeService})</span>
                </span>
                <span className="font-semibold text-[#0B0D12]">
                  {/* #6 : Wawashi est une enveloppe annuelle utilisable quand on veut, pas un montant mensuel fixe. */}
                  {a.id === "wawashi" ? `${eur(a.montantNetAnnuel)} €/an` : `${eur(a.montantNetMensuel)} € net/mois`}
                </span>
              </p>
            ))}
            <p className="flex justify-between border-t border-[#ECEEF3] pt-1 text-sm font-bold tabular-nums">
              <span>Total avantages</span>
              <span style={{ color: VALIDE }}>{eur(avantages.totalNetMensuel)} € net/mois</span>
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[#7A8093]">Aucun avantage retenu — le net perçu ci-dessous n&rsquo;en tient pas compte.</p>
        )}
      </Field>

      {form.fraisMensuels > live.ndf && tjm > 0 && (
        <p className="-mt-2 text-sm text-[#7A8093]">
          Frais retenus : <strong className="tabular-nums text-[#0B0D12]">{eur(live.ndf)} €</strong> sur {eur(form.fraisMensuels)} € saisis
          (limite de 30 % du salaire brut).
        </p>
      )}

      <LiveFeedback live={live} avantagesInclus={avantages.avantagesInclus} tjm={tjm} />

      <button
        type="button"
        onClick={() => {
          trackEvent("sim_step_1_completed");
          goTo("foyer");
        }}
        className={`${PRIMARY_BTN} w-full sm:w-auto`}
      >
        Continuer
      </button>
    </Screen>
  );
}

/**
 * Aperçu immédiat. La mention sous le chiffre est DÉRIVÉE de la sélection
 * réelle — c'était une chaîne codée en dur (« Avantages inclus. »), et c'est
 * précisément ce qui produisait BUG-04.
 *
 * Retours #7, #28 et #34 (25/09) : le gros chiffre n'incluait pas les
 * avantages alors que le % à côté les incluait. Chaque montant dit désormais
 * ce qu'il contient — net en poche, avantages, total — et le % précise qu'il
 * est calculé avant impôt et quelle part est en avantages non retirables.
 */
function LiveFeedback({
  live,
  avantagesInclus,
  tjm,
}: {
  live: ReturnType<typeof useSimulation>["live"];
  avantagesInclus: boolean;
  tjm: number;
}) {
  const calculable = tjm > 0;
  return (
    <div className="mt-2 rounded-2xl p-5" style={{ backgroundColor: MINT }}>
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BRASS }}>
        Aperçu immédiat — portage RD optimisé
      </p>
      {calculable ? (
        <>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <p className="text-3xl font-extrabold tabular-nums md:text-4xl">
              <CountUp value={live.cashNet} /> €<span className="text-base font-medium text-[#4A5061]"> net en poche / mois</span>
            </p>
            <p className="text-sm font-bold tabular-nums" style={{ color: VALIDE }}>
              {pct(live.restitutionRate)} du CA restitué avant impôt
            </p>
          </div>
          <div className="mt-2 space-y-1 text-sm tabular-nums text-[#4A5061]">
            {avantagesInclus && (
              <p className="flex justify-between">
                <span>+ Avantages (cagnotte, titres-restaurant), non retirables en argent</span>
                <span className="font-semibold text-[#0B0D12]">{eur(live.benefitsTotal)} €</span>
              </p>
            )}
            <p className="flex justify-between">
              <span>= Rémunération globale / mois</span>
              <span className="font-semibold text-[#0B0D12]">{eur(live.globalCompensation)} €</span>
            </p>
          </div>
          <p className="mt-1 text-sm text-[#4A5061]">
            {avantagesInclus
              ? `Dont ${pct(live.benefitsRate)} du CA en avantages, non retirables en argent. `
              : "Sans avantages. "}
            Le détail foyer (votre vrai taux d&rsquo;imposition) arrive à l&rsquo;étape suivante.
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-[#4A5061]">Renseignez votre TJM pour voir l&rsquo;aperçu.</p>
      )}
    </div>
  );
}

export { CAGNOTTE_PROVIDERS };
