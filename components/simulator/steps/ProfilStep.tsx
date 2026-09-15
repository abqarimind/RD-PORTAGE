"use client";

import type { CurrentStatus } from "@/lib/fiscal/scenarios";
import { useSimulator } from "@/lib/simulateur/store";
import { trackEvent } from "@/lib/tracking/events";
import { Screen } from "../ui";

/** Étape 1 — segmentation. Chaque profil correspond à un statut du schéma lead. */
const PROFILES: { value: CurrentStatus; impatrie?: boolean; label: string; hint: string }[] = [
  { value: "freelance_micro", label: "Consultant freelance", hint: "Micro-entreprise, EI ou en cours de lancement." },
  { value: "porte_ailleurs", label: "Déjà en portage", hint: "Porté dans une autre société." },
  { value: "salarie_esn", label: "Salarié en ESN", hint: "En poste, vous étudiez le portage." },
  { value: "transition", label: "En reconversion / transition", hint: "Entre deux statuts ou en création." },
  {
    value: "salarie_esn",
    impatrie: true,
    label: "Impatrié (arrivé en France pour ce poste)",
    hint: "Régime art. 155 B — conditions strictes.",
  },
];

export function ProfilStep() {
  const { state, dispatch, goTo } = useSimulator();
  const { form } = state;

  return (
    <Screen title="Vous êtes…" subtitle="Une question à la fois, comme sur impots.gouv.fr — en plus rapide.">
      <div className="space-y-2.5">
        {PROFILES.map((p) => {
          const active = form.status === p.value && form.impatrie === !!p.impatrie;
          return (
            <button
              key={p.label}
              type="button"
              aria-pressed={active}
              onClick={() => {
                dispatch({ type: "set_profile", status: p.value, impatrie: !!p.impatrie });
                trackEvent("sim_started", { profile: p.value });
                goTo("activite");
              }}
              className={`w-full rounded-2xl border px-4 py-4 text-left transition-all duration-150 hover:-translate-y-0.5 ${
                active ? "border-transparent bg-[#0B0D12] text-white" : "border-[#E2E5EE] bg-white hover:border-[#B08D57]"
              }`}
            >
              <span className="block text-base font-bold">{p.label}</span>
              <span className={`text-sm ${active ? "text-white/70" : "text-[#7A8093]"}`}>{p.hint}</span>
            </button>
          );
        })}
      </div>
    </Screen>
  );
}
