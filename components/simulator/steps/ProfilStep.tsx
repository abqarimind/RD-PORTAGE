"use client";

import type { CurrentStatus } from "@/lib/fiscal/scenarios";
import { useSimulator } from "@/lib/simulateur/store";
import { trackEvent } from "@/lib/tracking/events";
import { BRASS, Screen } from "../ui";

/**
 * Étape 1 — segmentation.
 *
 * AUCUNE PRÉSÉLECTION (§4.3). Le profil détermine l'intégralité du calcul :
 * il doit être un choix explicite, jamais un défaut hérité. « Consultant
 * freelance » était à la fois la valeur par défaut et le premier élément de
 * la liste, si bien que le chemin le plus fréquent du simulateur menait au
 * seul résultat qui dessert le produit.
 *
 * L'ordre suit la pertinence produit : porté ailleurs, freelance, salarié en
 * ESN, en transition. « Impatrié » ferme la liste : c'est un cas rare, mais
 * il ouvre le régime art. 155 B, déjà câblé dans le moteur IR — le retirer de
 * l'interface le rendrait inatteignable.
 *
 * Dans le cas normal, le profil arrive prérempli par le diagnostic flash :
 * cet écran ne s'affiche que pour les arrivées directes sur /simulateur, ou
 * quand l'utilisateur revient corriger son choix.
 */
const PROFILES: { value: CurrentStatus; impatrie?: boolean; label: string; hint: string }[] = [
  { value: "porte_ailleurs", label: "Déjà en portage", hint: "Porté dans une autre société." },
  // #8 : « Freelance » tout court ; micro ou société se précise à l'étape suivante.
  { value: "freelance_micro", label: "Freelance", hint: "Micro-entreprise, société (SASU / EURL) ou en lancement." },
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
      {state.prefilled.status && (
        <p className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: "#FFF1DE" }}>
          Repris de votre diagnostic. Corrigez-le si besoin — rien n&rsquo;est verrouillé.
        </p>
      )}

      <div className="space-y-2.5">
        {PROFILES.map((p) => {
          // Aucune sélection tant que l'utilisateur n'a pas choisi : status est
          // nul au départ, donc aucune carte n'est active.
          const statutCarte = form.status === "freelance_sasu" ? "freelance_micro" : form.status;
          const active = form.status !== null && statutCarte === p.value && form.impatrie === !!p.impatrie;
          return (
            <button
              key={p.label}
              type="button"
              aria-pressed={active}
              onClick={() => {
                // Revenir sur « Freelance » ne perd pas la structure déjà choisie.
                const status = p.value === "freelance_micro" && form.status === "freelance_sasu" ? "freelance_sasu" : p.value;
                dispatch({ type: "set_profile", status, impatrie: !!p.impatrie });
                trackEvent("sim_started", { profile: p.value });
                goTo("activite");
              }}
              className={`w-full rounded-2xl border px-4 py-4 text-left transition-[background-color,border-color,color,transform,box-shadow] duration-150 hover:-translate-y-0.5 ${
                active ? "border-transparent bg-[#0B0D12] text-white" : "border-[#E2E5EE] bg-white hover:border-[#B08D57]"
              }`}
              style={active || !state.prefilled.status ? undefined : { borderColor: BRASS }}
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
