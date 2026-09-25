"use client";

/**
 * Étape 5 — Inscription (lead gate), puis accès au dossier.
 *
 * BUG-06 — l'ancien bouton « Télécharger le dossier » appelait window.print(),
 * sans aucune génération de document : sur Safari iOS l'appel est ignoré, ce
 * qui donnait très exactement « le bouton ne fonctionnait pas », en silence.
 * Il est remplacé par un lien vers /dossier, une page web : rien à
 * télécharger, rien qui puisse être bloqué par le navigateur, et le même lien
 * est envoyé par email — donc consultable depuis n'importe quel appareil.
 *
 * L'échec d'envoi n'est jamais bloquant (spec §5.2) : le dossier reste
 * accessible même si l'email part en erreur.
 */
import { useId, useRef, useState } from "react";
import { useSimulator } from "@/lib/simulateur/store";
import { useSimulation } from "@/lib/simulateur/useSimulation";
import { setLeadId, trackEvent } from "@/lib/tracking/events";
import { deriveLeadSource, deviceType, getAttribution } from "@/lib/tracking/utm";
import { metaLead, newEventId } from "@/lib/tracking/meta";
import { CTA_CONSEILLER, DELAI_RAPPEL, EMAIL_ENTREPRISE, POLICY_VERSION, RDV_URL, SEQUENCE_NB_EMAILS } from "@/config/contact";
import { ContactOptions } from "@/components/ContactOptions";
import { ALERTE, BRASS, eur, Field, GHOST_BTN, OUTLINE_BTN, PRIMARY_BTN, pct, VALIDE } from "../ui";

const META_LEAD_EVENT_ID_KEY = "rdp_meta_lead_eid";

export function InscriptionStep({ onRdv }: { onRdv: (from: string) => void }) {
  const { state, dispatch, goTo, reset } = useSimulator();
  const { result, live, simInput, missing } = useSimulation();

  const ids = { prenom: useId(), email: useId(), tel: useId() };
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dossierHref, setDossierHref] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  /** Idempotence côté client : un double-clic n'envoie qu'une soumission. */
  const inFlight = useRef(false);

  if (missing.length > 0 || !result) {
    return (
      <section>
        <h1 className="text-2xl font-extrabold tracking-tight">Complétez votre simulation</h1>
        <p className="mt-2 text-base text-[#4A5061]">Il manque une information avant de pouvoir générer votre dossier.</p>
        <button type="button" className={`${OUTLINE_BTN} mt-4`} onClick={() => goTo("resultats")}>
          Revenir à mes résultats
        </button>
      </section>
    );
  }

  // Capturé hors de la closure : à l'intérieur d'un callback async, le
  // rétrécissement de type opéré par le retour anticipé ci-dessus est perdu.
  const computed = result;
  const optimise = computed.scenarios[2];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
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
          // Clé d'idempotence : même simulation + même email = un seul envoi.
          simulation_id: state.simulationId,
          identity: { email, first_name: firstName, phone: phone || undefined },
          form: state.form,
          profile: {
            statut_actuel: state.form.status,
            tjm_ou_ca: simInput.tjmOrMonthlyGross,
            jours_factures: state.form.days,
            foyer: {
              situation: state.form.situation,
              enfants: state.form.enfants,
              garde_alternee: state.form.gardeAlternee,
            },
          },
          simulation: {
            inputs: simInput as unknown as Record<string, unknown>,
            scenarios: computed.scenarios as unknown as Record<string, unknown>[],
            economie_annuelle_eur: computed.economieAnnuelleEur,
            completed: true,
          },
          consent: { marketing_optin: consent, timestamp: new Date().toISOString(), policy_version: POLICY_VERSION },
          attribution: { ...attribution, lead_source: deriveLeadSource(attribution.first_touch), device: deviceType() },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { leadId: string; dossierUrl?: string; emailSent?: boolean };

      setLeadId(data.leadId);
      trackEvent("lead_submitted");
      metaLead(metaEventId, { email, phone });
      try {
        localStorage.setItem(META_LEAD_EVENT_ID_KEY, metaEventId);
      } catch {
        /* non bloquant */
      }
      setDossierHref(data.dossierUrl ?? "/dossier");
      setEmailSent(data.emailSent ?? false);
      dispatch({ type: "unlock", leadId: data.leadId });
    } catch (err) {
      console.error("[simulateur] échec de soumission du lead", err);
      setSubmitError("Une erreur est survenue. Vos réponses sont conservées — réessayez dans un instant.");
      inFlight.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * E3 + E4 — DEMANDE DE DIAGNOSTIC (§4.1).
   *
   * Le clic vers le Diagnostic 30 min est une demande de rendez-vous : un
   * acte plus fort que l'inscription, qui est déjà couverte par E1/E2. Ce
   * couple signale donc un lead plus chaud, il ne doublonne rien, et aucun
   * lead n'est perdu si ce clic n'a pas lieu. Envoi au plus une fois par
   * simulation, sans jamais retarder la navigation de l'utilisateur.
   */
  const diagnosticSent = useRef(false);
  function notifyDemandeDiagnostic() {
    if (diagnosticSent.current || !state.leadId) return;
    diagnosticSent.current = true;
    const attribution = getAttribution();
    void fetch("/api/demande-diagnostic", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        lead_id: state.leadId,
        simulation_id: state.simulationId,
        identity: { first_name: firstName, email, phone: phone || undefined },
        form: state.form,
        source: {
          utmSource: attribution.first_touch?.utm_source,
          utmMedium: attribution.first_touch?.utm_medium,
          utmCampaign: attribution.first_touch?.utm_campaign,
          leadSource: deriveLeadSource(attribution.first_touch),
          device: deviceType(),
        },
      }),
    }).catch((err) => console.error("[demande-diagnostic] notification non envoyée", err));
  }

  /* ————— après soumission : accès au dossier ————— */
  if (state.unlocked) {
    return (
      <section>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BRASS }}>
          C&rsquo;est prêt
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">Votre dossier est disponible</h1>
        <p className="mt-2 text-base text-[#4A5061]">
          {emailSent ? (
            <>
              Nous venons de l&rsquo;envoyer à <strong className="text-[#0B0D12]">{email}</strong> — le lien ci-dessous ouvre le
              même dossier.
            </>
          ) : (
            "Ouvrez-le ci-dessous. Si vous ne recevez pas l'email, ce lien reste valable."
          )}
        </p>
        {/* Retour terrain : un email de simulation est arrivé en spam. */}
        <p className="mt-3 rounded-xl px-3 py-2 text-sm leading-relaxed text-[#4A5061]" style={{ backgroundColor: "#FFF1DE" }}>
          Pas reçu d&rsquo;ici quelques minutes ? Regardez dans vos <strong>courriers indésirables (spams)</strong> ou
          l&rsquo;onglet <strong>Promotions</strong>, et ajoutez <strong>{EMAIL_ENTREPRISE}</strong> à vos contacts pour
          recevoir la suite.
        </p>
        <p className="mt-3 text-sm tabular-nums text-[#7A8093]">
          Taux moyen foyer optimisé : {pct(optimise.averageTaxRate)} · TMI {(optimise.marginalRate * 100).toFixed(0)} %.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={dossierHref ?? "/dossier"}
            onClick={() => trackEvent("dossier_opened")}
            className={PRIMARY_BTN}
          >
            Ouvrir mon dossier
          </a>
          <a
            href={RDV_URL}
            onClick={() => {
              onRdv("sim_unlocked");
              notifyDemandeDiagnostic();
            }}
            className={OUTLINE_BTN}
          >
            {CTA_CONSEILLER}
          </a>
        </div>

        <p className="mt-3 text-sm text-[#7A8093]">
          {phone ? `Un conseiller RD Portage vous rappelle ${DELAI_RAPPEL} au ${phone}. ` : ""}
          Diagnostic de 30 minutes, proposition ferme, signature possible sous 48 h.
        </p>
        <ContactOptions />

        <div className="mt-6 border-t border-[#ECEEF3] pt-5">
          <button type="button" className={GHOST_BTN} onClick={reset}>
            Nouvelle simulation
          </button>
        </div>
      </section>
    );
  }

  /* ————— formulaire ————— */
  return (
    <section>
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BRASS }}>
        Dernière étape
      </p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">Recevez votre dossier complet</h1>
      <p className="mt-2 text-base text-[#4A5061]">
        Le détail des 3 scénarios et votre récapitulatif, calculés sur votre foyer réel.
      </p>

      <form className="mt-6 space-y-4 rounded-2xl border border-[#ECEEF3] bg-white p-5 shadow-sm" onSubmit={submit}>
        <Field label="Votre prénom" htmlFor={ids.prenom}>
          <input
            id={ids.prenom}
            className="sim-input"
            required
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </Field>
        <Field label="Votre email" htmlFor={ids.email}>
          <input
            id={ids.email}
            className="sim-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Votre téléphone (optionnel)" hint={`Uniquement si vous souhaitez qu’un conseiller vous rappelle (${DELAI_RAPPEL}).`} htmlFor={ids.tel}>
          <input
            id={ids.tel}
            className="sim-input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        {/*
         * #10 (RGPD, validé par Ridha) : l'envoi de la simulation est l'objet
         * même du formulaire, il ne dépend d'aucune case. Les emails de
         * conseil ont leur propre case, FACULTATIVE et non pré-cochée : c'est
         * la seule qui alimente consent.marketing_optin.
         */}
        <p className="text-sm text-[#4A5061]">
          Nous utilisons votre email pour vous envoyer votre simulation.{" "}
          <a href="/confidentialite" className="underline">
            Politique de confidentialité
          </a>{" "}
          version {POLICY_VERSION}.
        </p>
        <label className="flex min-h-[44px] items-start gap-3 text-sm text-[#4A5061]">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 accent-[#0B0D12]"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            (Facultatif) J&rsquo;accepte aussi de recevoir les conseils d&rsquo;optimisation de RD Portage : {SEQUENCE_NB_EMAILS} emails
            sur 14 jours, désinscription en un clic.
          </span>
        </label>
        {submitError && (
          <p className="text-sm font-semibold" style={{ color: ALERTE }}>
            {submitError}
          </p>
        )}
        <button type="submit" disabled={submitting} className={`${PRIMARY_BTN} w-full sm:w-auto`}>
          {submitting ? "Envoi en cours…" : "Recevoir mon dossier"}
        </button>
        <p className="text-sm leading-relaxed text-[#7A8093]">
          Votre dossier arrive par email dans la minute, envoyé par {EMAIL_ENTREPRISE}. Pensez à vérifier vos courriers
          indésirables (spams) s&rsquo;il n&rsquo;apparaît pas.
        </p>
      </form>

      <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-[#ECEEF3] pt-5">
        <button type="button" className={GHOST_BTN} onClick={() => goTo("resultats")}>
          Revenir à mes résultats
        </button>
      </div>
      <p className="mt-2 text-xs text-[#9aa0b0]">
        Économie estimée sur la base de votre foyer : {eur(Math.abs(result.economieAnnuelleEur))} €/an
        {result.economieAnnuelleEur < 0 ? " en faveur de votre statut actuel" : ""}.{" "}
        <span style={{ color: VALIDE }}>Aucune carte bancaire, aucun engagement.</span>
      </p>
    </section>
  );
}
