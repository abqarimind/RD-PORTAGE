"use client";

import { useState } from "react";
import { foyerLabel } from "@/lib/diagnostic/answers";
import { useSimulator } from "@/lib/simulateur/store";
import { trackEvent } from "@/lib/tracking/events";
import { AmountInput, Field, PRIMARY_BTN, Screen, Segmented, Stepper } from "../ui";

/**
 * Étape 3 — foyer fiscal : ce qui distingue ce simulateur des autres.
 *
 * 14/10 — seulement ce qui concerne la personne :
 *  - la réponse « foyer » du diagnostic préremplit la situation et les
 *    enfants (un couple sans enfant ne voit pas les questions d'enfants) ;
 *  - la garde alternée n'apparaît que s'il y a des enfants ;
 *  - frais réels, PER, foncier et dons sont repliés (facultatifs) ;
 *  - « Modifier mon foyer » rouvre tout, rien n'est verrouillé.
 * (Une personne seule sans enfant ne passe pas par cet écran.)
 */
export function FoyerStep() {
  const { state, setField, goTo } = useSimulator();
  const { form } = state;
  const repris = state.foyerDiag;
  const [toutVoir, setToutVoir] = useState(repris === null || repris === "seul");
  const montrerEnfants = toutVoir || repris === "enfants";

  return (
    <Screen title="Ton foyer" subtitle="C'est ici que la plupart des simulateurs s'arrêtent. Pas celui-là.">
      {repris && !toutVoir && (
        <p className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: "#FFF1DE" }}>
          Repris de ton diagnostic : <strong>{foyerLabel(repris)}</strong>.{" "}
          <button type="button" className="font-bold underline underline-offset-2" onClick={() => setToutVoir(true)}>
            Modifier mon foyer
          </button>
        </p>
      )}

      <Field label="Ta situation">
        <Segmented
          options={[
            { value: "celibataire", label: "Célibataire / seul·e" },
            { value: "marie_pacse", label: "Marié·e ou pacsé·e" },
          ]}
          value={form.situation}
          onChange={(v) => setField("situation", v as "celibataire" | "marie_pacse")}
        />
      </Field>

      {form.situation === "marie_pacse" && (
        <AmountInput
          label="Revenu net imposable annuel de ton conjoint"
          hint="0 si ton conjoint n'a pas de revenu imposable."
          value={form.revenuConjoint}
          min={0}
          max={150000}
          step={1000}
          onChange={(v) => setField("revenuConjoint", v)}
        />
      )}

      {montrerEnfants && (
        <Field label="Enfants à charge" hint="Comptés à 100 % dans ton foyer fiscal.">
          <Stepper value={form.enfants} onChange={(v) => setField("enfants", v)} />
        </Field>
      )}

      {montrerEnfants && form.enfants > 0 && (
        <Field label="Dont en garde alternée" hint="Comptés pour une demi-part partagée : le bon plafond est appliqué.">
          <Stepper value={form.gardeAlternee} max={form.enfants} onChange={(v) => setField("gardeAlternee", v)} />
        </Field>
      )}

      <details className="rounded-2xl border border-[#ECEEF3] bg-[#FAFBFD] px-4 py-2">
        <summary className="min-h-[44px] cursor-pointer py-2 text-base font-bold text-[#0B0D12]">
          Autres leviers (facultatif) : frais réels, PER, foncier, dons
        </summary>
        <div className="mt-3 space-y-5 pb-3">
          <Field
            label="Frais réels ou abattement de 10 % ?"
            hint="Par défaut, l'abattement forfaitaire. Active les frais réels s'ils sont supérieurs."
          >
            <Segmented
              options={[
                { value: "no", label: "Abattement 10 %" },
                { value: "yes", label: "Frais réels" },
              ]}
              value={form.useFraisReels ? "yes" : "no"}
              onChange={(v) => setField("useFraisReels", v === "yes")}
            />
          </Field>
          {form.useFraisReels && (
            <AmountInput
              label="Frais réels professionnels par an"
              value={form.fraisReels}
              min={0}
              max={30000}
              step={500}
              onChange={(v) => setField("fraisReels", v)}
            />
          )}
          <AmountInput
            label="Versements PER prévus par an"
            hint="Déductibles jusqu'à 10 % des revenus pro (plafond 37 680 €)."
            value={form.per}
            min={0}
            max={37680}
            step={500}
            onChange={(v) => setField("per", v)}
          />
          <AmountInput
            label="Revenus fonciers nets par an"
            value={form.foncier}
            min={0}
            max={60000}
            step={500}
            onChange={(v) => setField("foncier", v)}
          />
          <AmountInput
            label="Dons aux associations par an"
            hint="Réduction 75 % jusqu'à 1 000 €, puis 66 %."
            value={form.dons}
            min={0}
            max={5000}
            step={100}
            onChange={(v) => setField("dons", v)}
          />
        </div>
      </details>

      <button
        type="button"
        onClick={() => {
          trackEvent("sim_step_2_completed");
          goTo("resultats");
        }}
        className={`${PRIMARY_BTN} w-full sm:w-auto`}
      >
        Voir mon résultat
      </button>
    </Screen>
  );
}
