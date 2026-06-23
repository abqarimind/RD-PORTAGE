"use client";

/**
 * Simulateur RD Portage — lead magnet, mobile-first, step-by-step (spec §6).
 * Étape 0 Profil · 1 Activité (feedback live) · 2 Foyer · 3 Résultats
 * (3 scénarios + vrai taux + count-up + « comment c'est calculé ») ·
 * 4 Lead gate (avant le PDF détaillé).
 *
 * Design unifié avec les landings /lp (fintech clair + fil doré) : Manrope,
 * serif éditoriale sur les titres clés, laiton sur les chiffres.
 * Two engines: lib/fiscal/portage.ts + lib/fiscal/ir.ts, config in
 * config/fiscal-2026.ts. Funnel wiring (events, lead schema, Meta) preserved.
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

/* design tokens — shared with /lp (LandingC) */
const PEACH = "#FFF1DE";
const MINT = "#E7F6EE";
const INK = "#0B0D12";
const BRASS = "#B08D57";
const VALIDE = "#2F6B4F";
// Client préfère un seul niveau typographique (pas de serif).
const SANS = "'Manrope','IBM Plex Sans',sans-serif";
const SERIF = SANS;

const eur = (n: number) => Math.round(n).toLocaleString("fr-FR");
const pct = (n: number) => `${(n * 100).toFixed(1)} %`;
const POLICY_VERSION = "privacy-2026-06";
const RDV_URL = process.env.NEXT_PUBLIC_RDV_URL ?? "tel:+33632988723";
const AUTOSAVE_KEY = "rdp_sim_state";
const META_LEAD_EVENT_ID_KEY = "rdp_meta_lead_eid";

const PRIMARY_BTN =
  "rounded-full bg-[#0B0D12] px-6 py-3 text-center text-sm font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60";
const OUTLINE_BTN =
  "rounded-full border border-[#D8DCE6] bg-white px-6 py-3 text-center text-sm font-bold text-[#0B0D12] transition-colors hover:border-[#B08D57]";

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

  useEffect(() => {
    ensureMetaInit();
    metaSimulateurStart();
  }, []);

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
    <div className="mx-auto max-w-2xl px-4 py-8" style={{ fontFamily: SANS, color: INK }}>
      <ProgressBar step={Math.min(step, 3)} />

      <div key={step} className="step-enter">
        {step === 0 && (
          <Screen title="Vous êtes…" subtitle="Une question à la fois, comme sur impots.gouv.fr — en plus rapide.">
            <div className="space-y-2.5">
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
                    className={`w-full rounded-2xl border px-4 py-3.5 text-left transition-all duration-150 hover:-translate-y-0.5 ${
                      active ? "border-transparent bg-[#0B0D12] text-white" : "border-[#E2E5EE] bg-white hover:border-[#B08D57]"
                    }`}
                  >
                    <span className="block font-bold">{p.label}</span>
                    <span className={`text-xs ${active ? "text-white/70" : "text-[#7A8093]"}`}>{p.hint}</span>
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
              <Segmented
                options={[
                  { value: "celibataire", label: "Célibataire / seul·e" },
                  { value: "marie_pacse", label: "Marié·e ou pacsé·e" },
                ]}
                value={form.situation}
                onChange={(v) => set("situation", v as FormState["situation"])}
              />
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
              <Segmented
                options={[
                  { value: "no", label: "Abattement 10 %" },
                  { value: "yes", label: "Frais réels" },
                ]}
                value={form.useFraisReels ? "yes" : "no"}
                onChange={(v) => set("useFraisReels", v === "yes")}
              />
            </Field>
            {form.useFraisReels && (
              <Slider label="Frais réels professionnels par an (€)" min={0} max={30000} step={500} value={form.fraisReels} onChange={(v) => set("fraisReels", v)} />
            )}
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer font-semibold text-[#7A8093]">Autres leviers (PER, foncier, dons)</summary>
              <div className="mt-3 space-y-4">
                <Slider label="Versements PER prévus par an (€)" hint="Déductibles jusqu'à 10 % des revenus pro (plafond 37 680 €)." min={0} max={37680} step={500} value={form.per} onChange={(v) => set("per", v)} />
                <Slider label="Revenus fonciers nets par an (€)" min={0} max={60000} step={500} value={form.foncier} onChange={(v) => set("foncier", v)} />
                <Slider label="Dons aux associations par an (€)" hint="Réduction 75 % jusqu'à 1 000 €, puis 66 %." min={0} max={5000} step={100} value={form.dons} onChange={(v) => set("dons", v)} />
              </div>
            </details>
            <NextButton onClick={next} label="Voir mon résultat" />
          </Screen>
        )}

        {step === 3 && result && <Results result={result} live={live} form={form} onContinue={() => goTo(4)} onRdv={onRdv} />}

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

      <p className="mt-10 text-center text-xs text-[#9aa0b0]">
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
            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
              value === o.id ? "border-transparent bg-[#0B0D12] text-white" : "border-[#E2E5EE] bg-white text-[#0B0D12] hover:border-[#B08D57]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {value !== "aucune" && <p className="mt-1.5 text-xs tabular-nums text-[#7A8093]">Net reçu estimé : {eur(net)} €/mois.</p>}
    </Field>
  );
}

function LiveFeedback({ netPercu, restitution }: { netPercu: number; restitution: number }) {
  return (
    <div className="mt-2 rounded-2xl p-5" style={{ backgroundColor: MINT }}>
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BRASS }}>
        Aperçu immédiat — portage RD optimisé
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <p className="text-3xl font-extrabold tabular-nums md:text-4xl" style={{ fontFamily: SERIF }}>
          <CountUp value={netPercu} /> €<span className="text-base font-medium text-[#4A5061]"> perçu net / mois</span>
        </p>
        <p className="text-sm font-bold tabular-nums" style={{ color: VALIDE }}>
          {pct(restitution)} du CA restitué
        </p>
      </div>
      <p className="mt-1 text-xs text-[#4A5061]">Avantages inclus. Le détail foyer (votre vrai taux d'imposition) arrive à l'étape suivante.</p>
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
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BRASS }}>
        Votre résultat
      </p>
      <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl" style={{ fontFamily: SERIF }}>
        Votre vrai taux d&rsquo;imposition du foyer : <span style={{ color: VALIDE }}>{pct(optimise.averageTaxRate)}</span>
      </h1>
      <p className="mt-3 text-lg text-[#4A5061]">
        Vous laissez{" "}
        <span className="text-2xl font-extrabold tabular-nums" style={{ color: VALIDE, fontFamily: SERIF }}>
          <CountUp value={result.economieAnnuelleEur} /> €
        </span>{" "}
        par an sur la table.
      </p>
      <p className="mt-1 text-sm tabular-nums text-[#7A8093]">
        Tranche marginale (TMI) : {(optimise.marginalRate * 100).toFixed(0)} % · écart entre portage classique et RD optimisé.
      </p>

      <ScenarioTable rows={[actuel, portage, optimise]} />
      <CommentCalcule live={live} optimise={optimise} form={form} />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" className={PRIMARY_BTN} onClick={onContinue}>
          Recevoir le détail + le PDF
        </button>
        <a href={RDV_URL} onClick={() => onRdv("sim_result")} className={OUTLINE_BTN}>
          Valider ce chiffre — appeler Ridha
        </a>
      </div>
    </section>
  );
}

function ScenarioTable({ rows }: { rows: ReturnType<typeof simulate>["scenarios"] }) {
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
              <tr key={s.id} className="border-b border-[#ECEEF3]" style={best ? { color: VALIDE, fontWeight: 700 } : { color: "#4A5061" }}>
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
    <details className="mt-6 rounded-2xl border border-[#ECEEF3] bg-[#FAFBFD] p-4 text-sm">
      <summary className="cursor-pointer font-bold text-[#0B0D12]">Comment c&rsquo;est calculé</summary>
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
        <p className="text-xl font-extrabold tabular-nums" style={{ color: VALIDE, fontFamily: SERIF }}>
          Économie estimée : {eur(economie)} €/an
        </p>
        <p className="mt-2 text-sm text-[#4A5061]">
          Votre récapitulatif détaillé arrive par email. Dernière étape : validez votre chiffre avec Ridha.
        </p>
        <p className="mt-3 text-sm tabular-nums text-[#7A8093]">
          Taux moyen foyer optimisé : {pct(optimise.averageTaxRate)} · TMI {(optimise.marginalRate * 100).toFixed(0)} %.
        </p>
        <div className="no-print mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className={PRIMARY_BTN}
            onClick={() => {
              trackEvent("pdf_downloaded");
              window.print();
            }}
          >
            Télécharger le récapitulatif (PDF)
          </button>
          <a href={RDV_URL} onClick={() => onRdv("sim_unlocked")} className={OUTLINE_BTN}>
            Valider ce chiffre — Diagnostic 30 min
          </a>
        </div>
        <p className="mt-3 text-xs text-[#7A8093]">Diagnostic mené par Ridha (fondateur, ex-porté). Proposition ferme, signature possible sous 48 h.</p>
      </section>
    );
  }

  return (
    <section>
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BRASS }}>
        Dernière étape
      </p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl" style={{ fontFamily: SERIF }}>
        Recevez le détail + le PDF
      </h1>
      <p className="mt-2 text-sm text-[#4A5061]">
        Le détail des 3 scénarios et votre récapitulatif imprimable, calculés sur votre foyer réel.
      </p>
      <form
        className="mt-6 space-y-4 rounded-2xl border border-[#ECEEF3] bg-white p-5 shadow-sm"
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
        <label className="flex items-start gap-2 text-sm text-[#4A5061]">
          <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
          <span>
            J&rsquo;accepte de recevoir ma simulation détaillée et les conseils d&rsquo;optimisation de RD Portage (6 emails sur
            14 jours, désinscription en un clic). Politique de confidentialité version {POLICY_VERSION}.
          </span>
        </label>
        {submitError && <p className="text-sm text-[#b3261e]">{submitError}</p>}
        <button type="submit" disabled={submitting} className={`${PRIMARY_BTN} w-full sm:w-auto`}>
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
      <div className="flex justify-between text-xs text-[#7A8093]">
        {STEP_LABELS.map((l, i) => (
          <span key={l} className={i <= step ? "font-bold text-[#0B0D12]" : ""}>
            {l}
          </span>
        ))}
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#F0F1F5]">
        <div className="h-1.5 rounded-full transition-[width] duration-300" style={{ width: `${((step + 1) / 4) * 100}%`, backgroundColor: BRASS }} />
      </div>
    </div>
  );
}

function Screen({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section>
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl" style={{ fontFamily: SERIF }}>
        {title}
      </h1>
      <p className="mt-1 text-sm text-[#7A8093]">{subtitle}</p>
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-base font-bold text-[#0B0D12]">{label}</label>
      {hint && <p className="mb-2 mt-0.5 text-xs text-[#7A8093]">{hint}</p>}
      <div className={hint ? "" : "mt-2"}>{children}</div>
    </div>
  );
}

function Segmented({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
            value === o.value ? "border-transparent bg-[#0B0D12] text-white" : "border-[#E2E5EE] bg-white text-[#0B0D12] hover:border-[#B08D57]"
          }`}
        >
          {o.label}
        </button>
      ))}
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
        <input type="number" inputMode="numeric" className="input w-24 text-right tabular-nums" value={value} min={min} max={max} onChange={(e) => onChange(clamp(Number(e.target.value)))} />
      </div>
    </Field>
  );
}

function Stepper({ value, onChange, max = 12 }: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" className="h-11 w-11 rounded-full border border-[#E2E5EE] text-lg transition-colors hover:border-[#B08D57]" onClick={() => onChange(Math.max(0, value - 1))} aria-label="moins">
        −
      </button>
      <span className="w-8 text-center text-xl font-extrabold tabular-nums">{value}</span>
      <button type="button" className="h-11 w-11 rounded-full border border-[#E2E5EE] text-lg transition-colors hover:border-[#B08D57]" onClick={() => onChange(Math.min(max, value + 1))} aria-label="plus">
        +
      </button>
    </div>
  );
}

function NextButton({ onClick, label = "Continuer" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className={`${PRIMARY_BTN} w-full sm:w-auto`}>
      {label}
    </button>
  );
}

function Styles() {
  return (
    <style jsx global>{`
      .input {
        width: 100%;
        border: 1px solid #e2e5ee;
        border-radius: 12px;
        background: #fff;
        padding: 0.8rem 1rem;
        font-size: 1.05rem;
        color: #0b0d12;
      }
      .input:focus {
        outline: none;
        border-color: #b08d57;
        box-shadow: 0 0 0 3px rgba(176, 141, 87, 0.15);
      }
      .range {
        -webkit-appearance: none;
        appearance: none;
        height: 6px;
        border-radius: 999px;
        background: #ede3d2;
        outline: none;
      }
      .range::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: #0b0d12;
        border: 3px solid #fff;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
        cursor: pointer;
      }
      .range::-moz-range-thumb {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: #0b0d12;
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
