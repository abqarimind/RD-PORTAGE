"use client";

/**
 * Simulateur RD Portage — lead magnet, mobile-first, step-by-step (spec §6).
 * Étape 0 Profil · 1 Activité (feedback live) · 2 Foyer · 3 Résultats
 * (3 scénarios + vrai taux + count-up + « comment c'est calculé ») ·
 * 4 Lead gate (avant le PDF détaillé).
 *
 * Two engines: lib/fiscal/portage.ts (CA→net) + lib/fiscal/ir.ts (IR foyer),
 * config in config/fiscal-2026.ts. The funnel wiring (internal events, lead
 * schema, Meta Pixel/CAPI) is preserved end-to-end.
 */
import { useEffect, useMemo, useState } from "react";
import {
  BAREME_IR_2026,
  CAGNOTTE_PROVIDERS,
  type CagnotteChoice,
  cagnotteNet,
  RD_PORTAGE_2026,
} from "@/config/fiscal-2026";
import { computePortage } from "@/lib/fiscal/portage";
import { simulate, type CurrentStatus, type SimulationInput } from "@/lib/fiscal/scenarios";
import { setLeadId, trackEvent } from "@/lib/tracking/events";
import { deriveLeadSource, deviceType, getAttribution } from "@/lib/tracking/utm";
import {
  ensureMetaInit,
  metaContact,
  metaLead,
  metaSchedule,
  metaSimulateurComplete,
  metaSimulateurStart,
  newEventId,
} from "@/lib/tracking/meta";
import { CountUp } from "@/components/lp/CountUp";

const eur = (n: number) => Math.round(n).toLocaleString("fr-FR");
const pct = (n: number) => `${(n * 100).toFixed(1)} %`;
const POLICY_VERSION = "privacy-2026-06";
const RDV_URL = process.env.NEXT_PUBLIC_RDV_URL ?? "tel:+33632988723";
const AUTOSAVE_KEY = "rdp_sim_state";
const META_LEAD_EVENT_ID_KEY = "rdp_meta_lead_eid";

/** Étape 0 — segmentation. Each profile maps to a lead-schema status. */
const PROFILES: { value: CurrentStatus; impatrie?: boolean; label: string; hint: string }[] = [
  { value: "freelance_micro", label: "Consultant freelance", hint: "Micro-entreprise, EI ou en cours de lancement." },
  { value: "porte_ailleurs", label: "Déjà en portage", hint: "Porté dans une autre société." },
  { value: "salarie_esn", label: "Salarié en ESN", hint: "En poste, vous étudiez le portage." },
  { value: "transition", label: "En reconversion / transition", hint: "Entre deux statuts ou en création." },
  { value: "salarie_esn", impatrie: true, label: "Impatrié (arrivé en France pour ce poste)", hint: "Régime art. 155 B — conditions strictes." },
];

interface FormState {
  status: CurrentStatus;
  impatrie: boolean;
  tjm: number;
  days: number; // jours facturés / mois
  fraisMensuels: number;
  cagnotte: CagnotteChoice;
  situation: "celibataire" | "marie_pacse";
  enfants: number;
  gardeAlternee: number;
  revenuConjoint: number; // net imposable annuel
  useFraisReels: boolean;
  fraisReels: number; // annuel
  foncier: number;
  per: number;
  dons: number;
}

const DEFAULTS: FormState = {
  status: "freelance_micro",
  impatrie: false,
  tjm: 420,
  days: 20,
  fraisMensuels: 0,
  cagnotte: "may",
  situation: "celibataire",
  enfants: 0,
  gardeAlternee: 0,
  revenuConjoint: 0,
  useFraisReels: false,
  fraisReels: 0,
  foncier: 0,
  per: 0,
  dons: 0,
};

const STEP_LABELS = ["Profil", "Activité", "Foyer", "Résultats"];

export function Simulator() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [unlocked, setUnlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  // Meta SimulateurStart fires once on mount (canonical start of CONSIDÉRATION).
  useEffect(() => {
    ensureMetaInit();
    metaSimulateurStart();
  }, []);

  // Autosave (reprise) — restore form + step (never into the lead gate).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { form?: Partial<FormState>; step?: number };
        if (saved.form) setForm((f) => ({ ...f, ...saved.form }));
        if (typeof saved.step === "number") setStep(Math.min(Math.max(saved.step, 0), 3));
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ form, step: Math.min(step, 3) }));
    } catch {
      /* ignore */
    }
  }, [form, step]);

  const cagnotteGross = form.cagnotte === "aucune" ? 0 : CAGNOTTE_PROVIDERS[form.cagnotte].defaultMonthly;
  const cagnotteNetMonthly = cagnotteNet(form.cagnotte, cagnotteGross);

  // Live monthly portage (the step-1 "waouh"): valid for every profile as a
  // target-TJM portage projection.
  const live = useMemo(
    () =>
      computePortage({
        tjm: form.tjm,
        days: form.days,
        ndf: form.fraisMensuels,
        cagnotteMay: cagnotteNetMonthly,
        mealVouchers: true,
      }),
    [form.tjm, form.days, form.fraisMensuels, cagnotteNetMonthly],
  );

  const simInput: SimulationInput = useMemo(
    () => ({
      status: form.status,
      // ESN: derive a monthly gross from the target TJM so the "actuel"
      // salaried baseline stays consistent with the TJM the user enters.
      tjmOrMonthlyGross: form.status === "salarie_esn" ? Math.round((form.tjm * form.days) / 1.25) : form.tjm,
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
    }),
    [form, cagnotteGross],
  );

  const result = useMemo(() => (step >= 3 ? simulate(simInput) : null), [step, simInput]);

  const goTo = (next: number) => {
    setStep(next);
    window.scrollTo({ top: 0 });
  };

  const next = () => {
    if (step === 1) trackEvent("sim_step_1_completed");
    if (step === 2) {
      trackEvent("sim_step_2_completed");
      trackEvent("sim_completed");
      metaSimulateurComplete();
    }
    goTo(Math.min(step + 1, 4));
  };

  async function submitLead(identity: { email: string; firstName: string; phone?: string; consent: boolean }) {
    if (!result) return;
    setSubmitting(true);
    setSubmitError(null);
    const metaEventId = newEventId();
    try {
      const attribution = getAttribution();
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          meta_event_id: metaEventId,
          identity: { email: identity.email, first_name: identity.firstName, phone: identity.phone || undefined },
          profile: {
            statut_actuel: form.status,
            tjm_ou_ca: form.tjm,
            jours_factures: form.days,
            foyer: { situation: form.situation, enfants: form.enfants, garde_alternee: form.gardeAlternee },
          },
          simulation: {
            inputs: simInput as unknown as Record<string, unknown>,
            scenarios: result.scenarios as unknown as Record<string, unknown>[],
            economie_annuelle_eur: result.economieAnnuelleEur,
            completed: true,
          },
          consent: { marketing_optin: identity.consent, timestamp: new Date().toISOString(), policy_version: POLICY_VERSION },
          attribution: { ...attribution, lead_source: deriveLeadSource(attribution.first_touch), device: deviceType() },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { leadId } = (await res.json()) as { leadId: string };
      setLeadId(leadId);
      trackEvent("lead_submitted");
      metaLead(metaEventId, { email: identity.email, phone: identity.phone });
      try {
        localStorage.setItem(META_LEAD_EVENT_ID_KEY, metaEventId);
      } catch {
        /* non-blocking */
      }
      setUnlocked(true);
    } catch (err) {
      console.error(err);
      setSubmitError("Une erreur est survenue. Vos réponses sont conservées — réessayez dans un instant.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <ProgressBar step={Math.min(step, 3)} />

      <div key={step} className="step-enter">
        {step === 0 && (
          <Screen title="Vous êtes…" subtitle="Une question à la fois, comme sur impots.gouv.fr — en plus rapide.">
            <div className="space-y-2">
              {PROFILES.map((p) => {
                const active = form.status === p.value && form.impatrie === !!p.impatrie;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, status: p.value, impatrie: !!p.impatrie }));
                      trackEvent("sim_started", { profile: p.value });
                      next();
                    }}
                    className={`w-full rounded border px-4 py-3 text-left transition ${
                      active ? "border-nuit bg-nuit text-creme" : "border-laiton/60 bg-transparent text-encre hover:bg-laiton/15"
                    }`}
                  >
                    <span className="block font-medium">{p.label}</span>
                    <span className={`text-xs ${active ? "text-creme/80" : "text-encre/60"}`}>{p.hint}</span>
                  </button>
                );
              })}
            </div>
          </Screen>
        )}

        {step === 1 && (
          <Screen
            title="Votre activité"
            subtitle={form.status === "salarie_esn" ? "Votre TJM cible en portage." : "Ce que vous facturez (ou visez)."}
          >
            <Slider label="TJM — tarif jour HT (€)" min={150} max={2000} step={10} value={form.tjm} onChange={(v) => set("tjm", v)} />
            <Slider label="Jours facturés par mois" min={1} max={23} step={1} value={form.days} onChange={(v) => set("days", v)} />
            <Slider label="Frais professionnels mensuels (€)" hint="Déplacements, matériel, télétravail… Plafonnés à 30 % du CA." min={0} max={2000} step={50} value={form.fraisMensuels} onChange={(v) => set("fraisMensuels", v)} />
            <CagnotteSelect value={form.cagnotte} onChange={(v) => set("cagnotte", v)} net={cagnotteNetMonthly} />
            <LiveFeedback netPercu={live.netPerceived} restitution={live.restitutionRate} />
            <NextButton onClick={next} />
          </Screen>
        )}

        {step === 2 && (
          <Screen title="Votre foyer" subtitle="C'est ici que la plupart des simulateurs s'arrêtent. Pas celui-là.">
            <Field label="Votre situation">
              <div className="grid grid-cols-2 gap-2">
                {(["celibataire", "marie_pacse"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("situation", s)}
                    className={`rounded border px-4 py-3 text-sm transition ${
                      form.situation === s ? "border-nuit bg-nuit text-creme" : "border-laiton/60 text-encre hover:bg-laiton/15"
                    }`}
                  >
                    {s === "celibataire" ? "Célibataire / seul·e" : "Marié·e ou pacsé·e"}
                  </button>
                ))}
              </div>
            </Field>
            {form.situation === "marie_pacse" && (
              <Slider label="Revenu net imposable annuel du conjoint (€)" hint="0 si le conjoint n'a pas de revenu imposable." min={0} max={150000} step={1000} value={form.revenuConjoint} onChange={(v) => set("revenuConjoint", v)} />
            )}
            <Field label="Enfants à charge" hint="Comptés à 100 % dans votre foyer fiscal.">
              <Stepper value={form.enfants} onChange={(v) => set("enfants", v)} />
            </Field>
            <Field label="Dont en garde alternée" hint="Comptés pour une demi-part partagée — le bon plafond est appliqué.">
              <Stepper value={form.gardeAlternee} max={form.enfants} onChange={(v) => set("gardeAlternee", v)} />
            </Field>
            <Field label="Frais réels ou abattement de 10 % ?" hint="Par défaut, l'abattement forfaitaire. Activez les frais réels s'ils sont supérieurs.">
              <div className="grid grid-cols-2 gap-2">
                {[
                  [false, "Abattement 10 %"],
                  [true, "Frais réels"],
                ].map(([v, label]) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => set("useFraisReels", v as boolean)}
                    className={`rounded border px-4 py-3 text-sm transition ${
                      form.useFraisReels === v ? "border-nuit bg-nuit text-creme" : "border-laiton/60 text-encre hover:bg-laiton/15"
                    }`}
                  >
                    {label as string}
                  </button>
                ))}
              </div>
            </Field>
            {form.useFraisReels && (
              <Slider label="Frais réels professionnels par an (€)" min={0} max={30000} step={500} value={form.fraisReels} onChange={(v) => set("fraisReels", v)} />
            )}
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-encre/70">Autres leviers (PER, foncier, dons)</summary>
              <div className="mt-3 space-y-4">
                <Slider label="Versements PER prévus par an (€)" hint="Déductibles jusqu'à 10 % des revenus pro (plafond 37 680 €)." min={0} max={37680} step={500} value={form.per} onChange={(v) => set("per", v)} />
                <Slider label="Revenus fonciers nets par an (€)" min={0} max={60000} step={500} value={form.foncier} onChange={(v) => set("foncier", v)} />
                <Slider label="Dons aux associations par an (€)" hint="Réduction 75 % jusqu'à 1 000 €, puis 66 %." min={0} max={5000} step={100} value={form.dons} onChange={(v) => set("dons", v)} />
              </div>
            </details>
            <NextButton onClick={next} label="Voir mon résultat" />
          </Screen>
        )}

        {step === 3 && result && (
          <Results result={result} live={live} form={form} onContinue={() => goTo(4)} onRdv={onRdv} />
        )}

        {step === 4 && result && (
          <LeadGate
            economie={result.economieAnnuelleEur}
            unlocked={unlocked}
            submitting={submitting}
            submitError={submitError}
            result={result}
            onSubmit={submitLead}
            onRdv={onRdv}
          />
        )}
      </div>

      <p className="mt-10 text-center text-xs text-encre/50">
        Simulation à valeur indicative — ne constitue pas un conseil fiscal personnalisé. Barème IR 2026 (revenus 2025), cagnottes
        affichées nettes de frais de service.
      </p>

      <Styles />
    </div>
  );

  function onRdv(from: string) {
    trackEvent("rdv_clicked", { from });
    if (RDV_URL.startsWith("tel:")) metaContact({ from });
    else metaSchedule({ from });
  }
}

/* —————————————————————————— step 1 helpers —————————————————————————— */

function CagnotteSelect({ value, onChange, net }: { value: CagnotteChoice; onChange: (v: CagnotteChoice) => void; net: number }) {
  const options: { id: CagnotteChoice; label: string }[] = [
    { id: "may", label: "May" },
    { id: "wawashi", label: "Wawashi" },
    { id: "aucune", label: "Aucune" },
  ];
  return (
    <Field
      label="Cagnotte avantages"
      hint="Enveloppe d'avantages exonérés (chèques cadeaux, services à la personne, mobilité, culture), dans les plafonds URSSAF. Affichée nette de frais de service."
    >
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`rounded border px-3 py-2.5 text-sm transition ${
              value === o.id ? "border-nuit bg-nuit text-creme" : "border-laiton/60 text-encre hover:bg-laiton/15"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {value !== "aucune" && <p className="mt-1.5 text-xs text-encre/60 tnum">Net reçu estimé : {eur(net)} €/mois.</p>}
    </Field>
  );
}

function LiveFeedback({ netPercu, restitution }: { netPercu: number; restitution: number }) {
  return (
    <div className="mt-2 rounded border border-laiton bg-creme p-4">
      <p className="text-xs uppercase tracking-widest text-laiton">Aperçu immédiat — portage RD optimisé</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <p className="display text-2xl text-encre tnum md:text-3xl">
          <CountUp value={netPercu} /> €<span className="text-base font-normal text-encre/60"> perçu net / mois</span>
        </p>
        <p className="text-sm font-medium text-valide tnum">{pct(restitution)} du CA restitué</p>
      </div>
      <p className="mt-1 text-xs text-encre/55">Avantages inclus. Le détail foyer (votre vrai taux d'imposition) arrive à l'étape suivante.</p>
    </div>
  );
}

/* —————————————————————————— step 3 — results —————————————————————————— */

function Results({
  result,
  live,
  form,
  onContinue,
  onRdv,
}: {
  result: ReturnType<typeof simulate>;
  live: ReturnType<typeof computePortage>;
  form: FormState;
  onContinue: () => void;
  onRdv: (from: string) => void;
}) {
  const [actuel, portage, optimise] = result.scenarios;
  return (
    <section>
      <p className="text-xs uppercase tracking-widest text-laiton">Votre résultat</p>
      <h1 className="display mt-2 text-3xl leading-tight text-encre md:text-4xl">
        Votre vrai taux d&rsquo;imposition du foyer : <span className="text-valide tnum">{pct(optimise.averageTaxRate)}</span>
      </h1>
      <p className="mt-3 text-lg text-encre/80">
        Vous laissez{" "}
        <span className="display text-valide">
          <CountUp value={result.economieAnnuelleEur} /> €
        </span>{" "}
        par an sur la table.
      </p>
      <p className="mt-1 text-sm text-encre/60 tnum">
        Tranche marginale (TMI) : {(optimise.marginalRate * 100).toFixed(0)} % · écart calculé entre portage classique et RD optimisé.
      </p>

      <ScenarioTable actuel={actuel} portage={portage} optimise={optimise} />

      <CommentCalcule live={live} optimise={optimise} form={form} />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" className="cta-primary" onClick={onContinue}>
          Recevoir le détail + le PDF
        </button>
        <a
          href={RDV_URL}
          onClick={() => onRdv("sim_result")}
          className="rounded border border-nuit px-6 py-3 text-center font-sans text-base text-nuit transition hover:bg-nuit hover:text-creme"
        >
          Valider ce chiffre — appeler Ridha
        </a>
      </div>
    </section>
  );
}

function ScenarioTable({
  actuel,
  portage,
  optimise,
}: {
  actuel: ReturnType<typeof simulate>["scenarios"][number];
  portage: ReturnType<typeof simulate>["scenarios"][number];
  optimise: ReturnType<typeof simulate>["scenarios"][number];
}) {
  const rows = [actuel, portage, optimise];
  return (
    <table className="mt-6 w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-laiton text-xs uppercase tracking-wide text-encre/60">
          <th className="py-2 pr-2 font-medium">Scénario</th>
          <th className="py-2 pr-2 font-medium">Net perçu</th>
          <th className="py-2 pr-2 font-medium">Avantages</th>
          <th className="py-2 pr-2 font-medium">Impôt foyer</th>
          <th className="py-2 font-medium">Disponible / an</th>
        </tr>
      </thead>
      <tbody className="tnum">
        {rows.map((s) => (
          <tr key={s.id} className={`border-b border-laiton/40 ${s.id === "portage_rd_optimise" ? "font-medium text-valide" : "text-encre/85"}`}>
            <td className="py-3 pr-2 font-sans">{s.label}</td>
            <td className="py-3 pr-2">{eur(s.netPerceived)} €</td>
            <td className="py-3 pr-2">{eur(s.benefits)} €</td>
            <td className="py-3 pr-2">−{eur(s.tax)} €</td>
            <td className="py-3">{eur(s.disposable)} €</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CommentCalcule({
  live,
  optimise,
  form,
}: {
  live: ReturnType<typeof computePortage>;
  optimise: ReturnType<typeof simulate>["scenarios"][number];
  form: FormState;
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
    <details className="mt-6 rounded border border-laiton/50 bg-creme/60 p-4 text-sm">
      <summary className="cursor-pointer font-medium text-encre">Comment c&rsquo;est calculé</summary>
      <div className="mt-3 grid gap-1 tnum">
        {lines.map(([l, v]) => (
          <div key={l} className="flex justify-between border-b border-laiton/20 py-1">
            <span className="text-encre/70">{l}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between py-1">
          <span className="text-encre/70">Taux de restitution réel</span>
          <span className="font-medium text-valide">{pct(live.restitutionRate)}</span>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-encre/60">
        IR foyer : {optimise.details ? "barème progressif" : ""} {BAREME_IR_2026.version.replace("_", " ")}, quotient familial
        (plafonné à 1 807 €/demi-part), décote et abattement 10 % / frais réels appliqués. Taux moyen {pct(optimise.averageTaxRate)},
        TMI {(optimise.marginalRate * 100).toFixed(0)} %.
      </p>
      <p className="mt-2 text-xs text-encre/50">
        Sources : barème IR 2026 (service-public.gouv.fr), cascade portage (Excel RD « Simul Honoraires »), URSSAF / impots.gouv.fr.
        {form.cagnotte !== "aucune" && ` Cagnotte ${CAGNOTTE_PROVIDERS[form.cagnotte].label} affichée nette de frais.`}
      </p>
    </details>
  );
}

/* —————————————————————————— step 4 — lead gate —————————————————————————— */

function LeadGate({
  economie,
  unlocked,
  submitting,
  submitError,
  result,
  onSubmit,
  onRdv,
}: {
  economie: number;
  unlocked: boolean;
  submitting: boolean;
  submitError: string | null;
  result: ReturnType<typeof simulate>;
  onSubmit: (identity: { email: string; firstName: string; phone?: string; consent: boolean }) => void;
  onRdv: (from: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);

  if (unlocked) {
    const optimise = result.scenarios[2];
    return (
      <section>
        <p className="display text-xl text-valide tnum">Économie estimée : {eur(economie)} €/an</p>
        <p className="mt-2 text-sm text-encre/70">
          Votre récapitulatif détaillé arrive par email. Dernière étape : validez votre chiffre avec Ridha.
        </p>
        <p className="mt-3 text-sm text-encre/70 tnum">
          Taux moyen foyer optimisé : {pct(optimise.averageTaxRate)} · TMI {(optimise.marginalRate * 100).toFixed(0)} %.
        </p>
        <div className="no-print mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="cta-primary"
            onClick={() => {
              trackEvent("pdf_downloaded");
              window.print();
            }}
          >
            Télécharger le récapitulatif (PDF)
          </button>
          <a
            href={RDV_URL}
            onClick={() => onRdv("sim_unlocked")}
            className="rounded border border-nuit px-6 py-3 text-center font-sans text-base text-nuit transition hover:bg-nuit hover:text-creme"
          >
            Valider ce chiffre — Diagnostic 30 min
          </a>
        </div>
        <p className="mt-3 text-xs text-encre/60">Diagnostic mené par Ridha (fondateur, ex-porté). Proposition ferme, signature possible sous 48 h.</p>
      </section>
    );
  }

  return (
    <section>
      <p className="text-xs uppercase tracking-widest text-laiton">Dernière étape</p>
      <h1 className="display mt-2 text-2xl text-encre md:text-3xl">Recevez le détail + le PDF</h1>
      <p className="mt-2 text-sm text-encre/70">
        Le détail des 3 scénarios et votre récapitulatif imprimable, calculés sur votre foyer réel.
      </p>
      <form
        className="note-juridique mt-6 space-y-4"
        onFocus={() => trackEvent("email_gate_viewed")}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ email, firstName, phone: phone || undefined, consent });
        }}
      >
        <Field label="Votre prénom">
          <input className="input" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </Field>
        <Field label="Votre email">
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Votre téléphone (optionnel)" hint="Uniquement si vous souhaitez être rappelé·e pour le Diagnostic 30 min.">
          <input className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <label className="flex items-start gap-2 text-sm text-encre/90">
          {/* GDPR: explicit consent, NEVER pre-ticked. */}
          <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
          <span>
            J&rsquo;accepte de recevoir ma simulation détaillée et les conseils d&rsquo;optimisation de RD Portage (6 emails sur
            14 jours, désinscription en un clic). Politique de confidentialité version {POLICY_VERSION}.
          </span>
        </label>
        {submitError && <p className="text-sm text-encre">{submitError}</p>}
        <button type="submit" disabled={submitting} className="cta-primary w-full disabled:opacity-60 sm:w-auto">
          {submitting ? "Envoi en cours…" : "Recevoir ma simulation détaillée"}
        </button>
      </form>
    </section>
  );
}

/* —————————————————————————— shared UI —————————————————————————— */

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <div className="flex justify-between text-xs text-encre/60">
        {STEP_LABELS.map((l, i) => (
          <span key={l} className={i <= step ? "font-medium text-encre" : ""}>
            {l}
          </span>
        ))}
      </div>
      <div className="mt-2 h-1 w-full bg-laiton/30">
        <div className="h-1 bg-laiton transition-[width] duration-300" style={{ width: `${((step + 1) / 4) * 100}%` }} />
      </div>
    </div>
  );
}

function Screen({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section>
      <h1 className="display text-2xl text-encre md:text-3xl">{title}</h1>
      <p className="mt-1 text-sm text-encre/70">{subtitle}</p>
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-sans text-base font-medium text-encre">{label}</label>
      {hint && <p className="mb-2 mt-0.5 text-xs text-encre/60">{hint}</p>}
      <div className={hint ? "" : "mt-2"}>{children}</div>
    </div>
  );
}

function Slider({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(Math.max(Number.isFinite(v) ? v : min, min), max);
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(clamp(Number(e.target.value)))} className="range flex-1" aria-label={label} />
        <input type="number" inputMode="numeric" className="input tnum w-24 text-right" value={value} min={min} max={max} onChange={(e) => onChange(clamp(Number(e.target.value)))} />
      </div>
    </Field>
  );
}

function Stepper({ value, onChange, max = 12 }: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" className="h-11 w-11 rounded border border-laiton/60 text-lg" onClick={() => onChange(Math.max(0, value - 1))} aria-label="moins">
        −
      </button>
      <span className="display w-8 text-center text-xl tnum">{value}</span>
      <button type="button" className="h-11 w-11 rounded border border-laiton/60 text-lg" onClick={() => onChange(Math.min(max, value + 1))} aria-label="plus">
        +
      </button>
    </div>
  );
}

function NextButton({ onClick, label = "Continuer" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="cta-primary w-full sm:w-auto">
      {label}
    </button>
  );
}

function Styles() {
  return (
    <style jsx global>{`
      .input {
        width: 100%;
        border: 1px solid rgba(176, 141, 87, 0.6);
        border-radius: 2px;
        background: #fff;
        padding: 0.85rem 1rem;
        font-size: 1.05rem;
        color: #1a1a1a;
      }
      .input:focus {
        outline: 2px solid #0e1b33;
        outline-offset: 0;
      }
      .range {
        -webkit-appearance: none;
        appearance: none;
        height: 6px;
        border-radius: 999px;
        background: rgba(176, 141, 87, 0.3);
        outline: none;
      }
      .range::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: #0e1b33;
        border: 3px solid #fff;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
        cursor: pointer;
      }
      .range::-moz-range-thumb {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: #0e1b33;
        border: 3px solid #fff;
        cursor: pointer;
      }
      .step-enter {
        animation: stepIn 0.28s ease-out;
      }
      @keyframes stepIn {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .step-enter {
          animation: none;
        }
      }
    `}</style>
  );
}
