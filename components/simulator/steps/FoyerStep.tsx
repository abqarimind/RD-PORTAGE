"use client";

import { useSimulator } from "@/lib/simulateur/store";
import { trackEvent } from "@/lib/tracking/events";
import { metaSimulateurComplete } from "@/lib/tracking/meta";
import { AmountInput, Field, PRIMARY_BTN, Screen, Segmented, Stepper } from "../ui";

/** Étape 3 — foyer fiscal : ce qui distingue ce simulateur des autres. */
export function FoyerStep() {
  const { state, setField, goTo } = useSimulator();
  const { form } = state;

  return (
    <Screen title="Votre foyer" subtitle="C'est ici que la plupart des simulateurs s'arrêtent. Pas celui-là.">
      <Field label="Votre situation">
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
          label="Revenu net imposable annuel du conjoint"
          hint="0 si le conjoint n'a pas de revenu imposable."
          value={form.revenuConjoint}
          min={0}
          max={150000}
          step={1000}
          onChange={(v) => setField("revenuConjoint", v)}
        />
      )}

      <Field label="Enfants à charge" hint="Comptés à 100 % dans votre foyer fiscal.">
        <Stepper value={form.enfants} onChange={(v) => setField("enfants", v)} />
      </Field>

      <Field label="Dont en garde alternée" hint="Comptés pour une demi-part partagée — le bon plafond est appliqué.">
        <Stepper value={form.gardeAlternee} max={form.enfants} onChange={(v) => setField("gardeAlternee", v)} />
      </Field>

      <Field
        label="Frais réels ou abattement de 10 % ?"
        hint="Par défaut, l'abattement forfaitaire. Activez les frais réels s'ils sont supérieurs."
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

      <details className="mt-2">
        <summary className="min-h-[44px] cursor-pointer py-2 text-base font-semibold text-[#7A8093]">
          Autres leviers (PER, foncier, dons)
        </summary>
        <div className="mt-3 space-y-5">
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
          trackEvent("sim_completed");
          metaSimulateurComplete();
          goTo("resultats");
        }}
        className={`${PRIMARY_BTN} w-full sm:w-auto`}
      >
        Voir mon résultat
      </button>
    </Screen>
  );
}
