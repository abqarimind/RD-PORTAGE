"use client";

/**
 * Simulateur IR foyer — ACTE CONSIDÉRATION. impots.gouv.fr ergonomics:
 * one theme per screen, ≤3 visible fields, progress bar, plain-French
 * labels, smart defaults, 2-3 minutes total.
 * The range result is FREE; the detailed 3-scenario table + printable
 * summary require the email gate (explicit, unticked GDPR consent).
 */
import { useMemo, useState } from "react";
import { simulate, type CurrentStatus, type SimulationInput } from "@/lib/fiscal/scenarios";
import { trackEvent, setLeadId } from "@/lib/tracking/events";
import { deriveLeadSource, deviceType, getAttribution } from "@/lib/tracking/utm";

const eur = (n: number) => Math.round(n).toLocaleString("fr-FR");
const POLICY_VERSION = "privacy-2026-06";
/** Until a booking tool (Calendly) exists, the Diagnostic CTA dials Ridha. */
const RDV_URL = process.env.NEXT_PUBLIC_RDV_URL ?? "tel:+33632988723";

const STATUTS: { value: CurrentStatus; label: string }[] = [
  { value: "salarie_esn", label: "Salarié en ESN" },
  { value: "freelance_micro", label: "Freelance en micro-entreprise" },
  { value: "freelance_sasu", label: "Freelance en SASU / EURL" },
  { value: "porte_ailleurs", label: "Porté dans une autre société" },
  { value: "transition", label: "En transition entre deux statuts" },
];

interface FormState {
  status: CurrentStatus;
  tjm: number;
  days: number;
  situation: "celibataire" | "marie_pacse";
  enfants: number;
  gardeAlternee: number;
  fraisReels: number;
  foncier: number;
  per: number;
  dons: number;
  impatrie: boolean;
}

const DEFAULTS: FormState = {
  status: "salarie_esn",
  tjm: 450,
  days: 210,
  situation: "celibataire",
  enfants: 0,
  gardeAlternee: 0,
  fraisReels: 0,
  foncier: 0,
  per: 0,
  dons: 0,
  impatrie: false,
};

export function Simulator() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [unlocked, setUnlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const simInput: SimulationInput = useMemo(
    () => ({
      status: form.status,
      tjmOrMonthlyGross: form.status === "salarie_esn" ? form.tjm * 10 : form.tjm,
      daysPerYear: form.days,
      household: {
        maritalStatus: form.situation,
        children: form.enfants,
        childrenGardeAlternee: form.gardeAlternee,
      },
      fraisReelsAnnual: form.fraisReels || undefined,
      revenusFonciers: form.foncier || undefined,
      versementsPER: form.per || undefined,
      dons: form.dons || undefined,
      impatrie: form.impatrie || undefined,
    }),
    [form],
  );

  const result = useMemo(() => (step === 4 ? simulate(simInput) : null), [step, simInput]);

  const next = () => {
    trackEvent(`sim_step_${step}_completed` as "sim_step_1_completed");
    if (step === 3) trackEvent("sim_completed");
    setStep((s) => Math.min(s + 1, 4));
    window.scrollTo({ top: 0 });
  };

  async function submitLead(identity: { email: string; firstName: string; phone?: string; consent: boolean }) {
    if (!result) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const attribution = getAttribution();
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
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
          consent: {
            marketing_optin: identity.consent,
            timestamp: new Date().toISOString(),
            policy_version: POLICY_VERSION,
          },
          attribution: {
            ...attribution,
            lead_source: deriveLeadSource(attribution.first_touch),
            device: deviceType(),
          },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { leadId } = (await res.json()) as { leadId: string };
      setLeadId(leadId);
      trackEvent("lead_submitted");
      setUnlocked(true);
    } catch (err) {
      console.error(err);
      setSubmitError("Une erreur est survenue. Vos réponses sont conservées — réessayez dans un instant.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <ProgressBar step={step} />

      {step === 1 && (
        <Screen title="Vos revenus" subtitle="Une question à la fois, comme sur impots.gouv.fr — en plus rapide.">
          <Field label="Votre statut aujourd'hui">
            <select
              className="input"
              value={form.status}
              onChange={(e) => set("status", e.target.value as CurrentStatus)}
            >
              {STATUTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field
            label={form.status === "salarie_esn" ? "Votre salaire brut mensuel (€)" : "Votre TJM facturé (€ HT)"}
            hint={form.status === "salarie_esn" ? "Celui de votre fiche de paie, avant charges." : "Le tarif jour que vous facturez (ou visez)."}
          >
            <input
              type="number"
              inputMode="numeric"
              className="input tnum"
              value={form.status === "salarie_esn" ? form.tjm * 10 : form.tjm}
              min={0}
              onChange={(e) =>
                set("tjm", form.status === "salarie_esn" ? Number(e.target.value) / 10 : Number(e.target.value))
              }
            />
          </Field>
          {form.status !== "salarie_esn" && (
            <Field label="Jours facturés par an" hint="210 jours = mission pleine avec 5 semaines off.">
              <input
                type="number"
                inputMode="numeric"
                className="input tnum"
                value={form.days}
                min={0}
                max={260}
                onChange={(e) => set("days", Number(e.target.value))}
              />
            </Field>
          )}
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
                    form.situation === s ? "border-nuit bg-nuit text-creme" : "border-laiton/60 bg-transparent text-encre hover:bg-laiton/20"
                  }`}
                >
                  {s === "celibataire" ? "Célibataire / seul·e" : "Marié·e ou pacsé·e"}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Enfants à charge" hint="Comptés à 100 % dans votre foyer fiscal.">
            <Stepper value={form.enfants} onChange={(v) => set("enfants", v)} />
          </Field>
          <Field label="Dont en garde alternée" hint="Ils comptent pour une demi-part partagée — le simulateur applique le bon plafond.">
            <Stepper value={form.gardeAlternee} onChange={(v) => set("gardeAlternee", v)} />
          </Field>
          <NextButton onClick={next} />
        </Screen>
      )}

      {step === 3 && (
        <Screen
          title="Vos optimisations"
          subtitle="Tout est légal, plafonné et sourcé. Laissez à zéro ce qui ne vous concerne pas."
        >
          <Field label="Frais professionnels réels par an (€)" hint="Si supérieurs à l'abattement de 10 %, ils prennent le relais.">
            <input type="number" inputMode="numeric" className="input tnum" value={form.fraisReels} min={0}
              onChange={(e) => set("fraisReels", Number(e.target.value))} />
          </Field>
          <Field label="Versements PER prévus par an (€)" hint="Déductibles jusqu'à 10 % de vos revenus (plafond 37 680 €).">
            <input type="number" inputMode="numeric" className="input tnum" value={form.per} min={0}
              onChange={(e) => set("per", Number(e.target.value))} />
          </Field>
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-encre/70">Autres situations (foncier, impatrié, dons)</summary>
            <div className="mt-3 space-y-4">
              <Field label="Revenus fonciers nets par an (€)">
                <input type="number" inputMode="numeric" className="input tnum" value={form.foncier} min={0}
                  onChange={(e) => set("foncier", Number(e.target.value))} />
              </Field>
              <Field label="Dons aux associations par an (€)" hint="Réduction de 75 % jusqu'à 1 000 €, puis 66 %.">
                <input type="number" inputMode="numeric" className="input tnum" value={form.dons} min={0}
                  onChange={(e) => set("dons", Number(e.target.value))} />
              </Field>
              <label className="flex items-start gap-2 text-sm text-encre/90">
                <input type="checkbox" checked={form.impatrie} onChange={(e) => set("impatrie", e.target.checked)} className="mt-1" />
                <span>
                  Je suis arrivé·e en France pour ce poste (régime impatrié, art. 155 B) —{" "}
                  <em>conditions strictes, vérifiées ensemble au Diagnostic.</em>
                </span>
              </label>
            </div>
          </details>
          <NextButton onClick={next} label="Voir mon résultat" />
        </Screen>
      )}

      {step === 4 && result && (
        <Results
          result={result}
          unlocked={unlocked}
          submitting={submitting}
          submitError={submitError}
          onSubmit={submitLead}
        />
      )}

      <p className="mt-10 text-center text-xs text-encre/50">
        Simulation à valeur indicative — ne constitue pas un conseil fiscal personnalisé. Barème IR 2026 (revenus 2025), source impots.gouv.fr.
      </p>

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
      `}</style>
    </div>
  );
}

function ProgressBar({ step }: { step: number }) {
  const labels = ["Revenus", "Foyer", "Optimisations", "Résultat"];
  return (
    <div className="mb-8">
      <div className="flex justify-between text-xs text-encre/60">
        {labels.map((l, i) => (
          <span key={l} className={i + 1 <= step ? "font-medium text-encre" : ""}>{l}</span>
        ))}
      </div>
      <div className="mt-2 h-1 w-full bg-laiton/30">
        <div className="h-1 bg-laiton transition-all" style={{ width: `${(step / 4) * 100}%` }} />
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

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" className="h-11 w-11 rounded border border-laiton/60 text-lg" onClick={() => onChange(Math.max(0, value - 1))} aria-label="moins">−</button>
      <span className="display w-8 text-center text-xl tnum">{value}</span>
      <button type="button" className="h-11 w-11 rounded border border-laiton/60 text-lg" onClick={() => onChange(value + 1)} aria-label="plus">+</button>
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

function Results({
  result,
  unlocked,
  submitting,
  submitError,
  onSubmit,
}: {
  result: ReturnType<typeof simulate>;
  unlocked: boolean;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (identity: { email: string; firstName: string; phone?: string; consent: boolean }) => void;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const { economieAnnuelleEur, economieRange, scenarios } = result;

  return (
    <section>
      <p className="text-xs uppercase tracking-widest text-laiton">Votre résultat</p>
      {/* Signature figure, serif display. */}
      <h1 className="display mt-2 text-3xl leading-tight text-encre md:text-4xl">
        Vous laissez entre <span className="text-valide tnum">{eur(economieRange.low)} €</span> et{" "}
        <span className="text-valide tnum">{eur(economieRange.high)} €</span> par an sur la table.
      </h1>
      <p className="mt-2 text-sm text-encre/70">
        Fourchette calculée sur vos réponses. Le détail des 3 scénarios et votre récapitulatif imprimable sont gratuits — ils
        arrivent par email.
      </p>

      {!unlocked ? (
        <form
          className="note-juridique mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ email, firstName, phone: phone || undefined, consent });
          }}
          onFocus={() => trackEvent("email_gate_viewed")}
        >
          <p className="display text-lg text-encre">Recevoir le détail complet</p>
          <Field label="Votre prénom">
            <input className="input" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field label="Votre email">
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Votre téléphone (optionnel)" hint="Uniquement si vous souhaitez être rappelé·e pour le Diagnostic 30 min.">
            <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
      ) : (
        <div className="mt-8">
          <p className="display text-xl text-valide tnum">Économie estimée : {eur(economieAnnuelleEur)} €/an</p>
          <table className="mt-4 w-full border-collapse text-left text-sm">
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
              {scenarios.map((s) => (
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
          <p className="mt-2 text-xs text-encre/60">
            Taux moyen foyer optimisé : {(scenarios[2].averageTaxRate * 100).toFixed(1)} % · taux marginal {(scenarios[2].marginalRate * 100).toFixed(0)} %.
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
              onClick={() => trackEvent("rdv_clicked", { from: "sim_result" })}
              className="rounded border border-nuit px-6 py-3 text-center font-sans text-base text-nuit transition hover:bg-nuit hover:text-creme"
            >
              Valider ce chiffre — appeler Ridha (Diagnostic 30 min)
            </a>
          </div>
          <p className="mt-3 text-xs text-encre/60">
            Le Diagnostic est mené par Ridha (fondateur, ex-porté). À l&rsquo;issue : proposition ferme, signature possible sous 48 h.
          </p>
        </div>
      )}
    </section>
  );
}
