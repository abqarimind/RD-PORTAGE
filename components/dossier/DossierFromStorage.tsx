"use client";

/**
 * Repli : /dossier ouvert sans lien signé (accès direct, favori).
 * Reconstruit le dossier à partir de la simulation enregistrée localement.
 * Si rien n'est enregistré, on le dit clairement et on renvoie au simulateur
 * — jamais d'écran vide (§4.2).
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { CAGNOTTE_PROVIDERS, cagnotteNet } from "@/config/fiscal-2026";
import { computePortage } from "@/lib/fiscal/portage";
import { simulate } from "@/lib/fiscal/scenarios";
import { loadState } from "@/lib/simulateur/persistence";
import { buildPayload } from "@/lib/simulateur/payload";
import { resolvedTjm } from "@/lib/simulateur/state";
import type { SimulationResultPayload } from "@/types/simulation-result";
import { DossierView } from "./DossierView";

export function DossierFromStorage() {
  const [payload, setPayload] = useState<SimulationResultPayload | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const state = loadState();
    if (!state) {
      setReady(true);
      return;
    }
    const { form } = state;
    const tjm = resolvedTjm(form);
    if (!form.status || !(tjm > 0) || !(form.days > 0)) {
      setReady(true);
      return;
    }
    const status = form.status;

    const cagnotteGross = form.cagnotte === "aucune" ? 0 : CAGNOTTE_PROVIDERS[form.cagnotte].defaultMonthly;
    const live = computePortage({
      tjm,
      days: form.days,
      ndf: form.fraisMensuels,
      cagnotteMay: cagnotteNet(form.cagnotte, cagnotteGross),
      mealVouchers: form.titresResto,
    });
    const result = simulate({
      status,
      tjmOrMonthlyGross: status === "salarie_esn" ? Math.round((tjm * form.days) / 1.25) : tjm,
      daysPerYear: form.days * 12,
      household: { maritalStatus: form.situation, children: form.enfants, childrenGardeAlternee: form.gardeAlternee },
      fraisReelsAnnual: form.useFraisReels && form.fraisReels > 0 ? form.fraisReels : undefined,
      versementsPER: form.per || undefined,
      dons: form.dons || undefined,
      revenusFonciers: form.foncier || undefined,
      impatrie: form.impatrie || undefined,
      cagnotteChoice: form.cagnotte,
      cagnotteMonthly: cagnotteGross || undefined,
      revenuConjoint: form.situation === "marie_pacse" && form.revenuConjoint > 0 ? form.revenuConjoint : undefined,
    });

    setPayload(
      buildPayload(form, result, live, {
        // Aucune identité côté navigateur : le dossier reste anonyme ici.
        identite: { prenom: "", email: "" },
        simulationId: state.simulationId,
        dateSimulation: state.startedAt,
        baseUrl: window.location.origin,
      }),
    );
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="mx-auto max-w-reading px-4 py-16">
        <div className="h-8 w-2/3 animate-pulse rounded bg-[#F0F1F5]" />
        <div className="mt-6 h-40 animate-pulse rounded-3xl bg-[#F5F6F9]" />
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="mx-auto max-w-form px-4 py-20 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">Aucun dossier à afficher</h1>
        <p className="mt-3 text-base text-[#4A5061]">
          Ce lien ne contient pas de simulation, et aucune simulation récente n&rsquo;est enregistrée sur cet appareil.
        </p>
        <Link
          href="/simulateur"
          className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#0B0D12] px-6 py-3 text-base font-bold text-white"
        >
          Faire ma simulation
        </Link>
      </div>
    );
  }

  return <DossierView payload={payload} />;
}
