"use client";

/**
 * Demande de rappel — le seul formulaire du parcours (14/10).
 *
 * Deux moments, un même composant :
 *  - « fourchette » : juste après l'estimation du diagnostic, pour qui veut
 *    parler à Ridha sans remplir le simulateur ;
 *  - « resultats » : sur l'écran du résultat, au moment où la valeur est la
 *    plus visible (il remplace l'ancienne étape « Inscription »).
 *
 * Trois champs : prénom, téléphone (obligatoire, raison et délai annoncés),
 * e-mail (Resend identifie un contact par son e-mail). La case des conseils
 * par e-mail est séparée et décochée. Champ piège contre les robots. Le
 * téléphone est vérifié ici (confort), puis par /api/lead (autorité).
 *
 * Mesure : `Lead` Meta et `lead_submitted` Plausible UNIQUEMENT après la
 * réponse réussie du serveur, sans e-mail ni téléphone.
 */
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import type { Lead } from "@/lib/crm/schema";
import type { FormState } from "@/lib/simulateur/state";
import { formatPhone, normalizePhone, PHONE_ERROR } from "@/lib/phone";
import { setLeadId, trackEvent } from "@/lib/tracking/events";
import { trackContact } from "@/lib/tracking/analytics";
import { getLandingAngle } from "@/lib/tracking/journey";
import { hasMarketingConsent } from "@/lib/tracking/consent";
import { metaLead, newEventId } from "@/lib/tracking/meta";
import { deriveLeadSource, deviceType, getAttribution } from "@/lib/tracking/utm";
import { DELAI_RAPPEL, EMAIL_ENTREPRISE, PHONE_E164, PHONE_LABEL, POLICY_VERSION, SEQUENCE_NB_EMAILS } from "@/config/contact";

export type LeadContext = "fourchette" | "resultats";

/** Ce que l'écran appelant sait de la simulation au moment de l'envoi. */
export interface LeadDraft {
  simulation_id: string;
  form: FormState;
  profile: Lead["profile"];
  simulation: Lead["simulation"];
}

export interface LeadSent {
  leadId: string;
  dossierUrl?: string;
  emailSent: boolean;
  firstName: string;
  phone: string;
  email: string;
}

const INK = "#0B0D12";
const MUTED = "#4A5061";
const ALERTE = "#B3261E";
const INPUT =
  "block w-full min-h-[48px] rounded-xl border border-[#D8DCE6] bg-white px-4 py-3 text-base text-[#0B0D12] placeholder:text-[#8A90A0] focus:border-[#0B0D12] focus:outline-none focus:ring-2 focus:ring-[#0B0D12]/15";

export function LeadForm({
  context,
  draft,
  onSent,
  alreadySent = false,
}: {
  context: LeadContext;
  draft: () => LeadDraft | null;
  onSent?: (sent: LeadSent) => void;
  /** Lead déjà envoyé pour cette simulation (rechargement) : seule la confirmation s'affiche. */
  alreadySent?: boolean;
}) {
  const ids = { prenom: useId(), tel: useId(), telErreur: useId(), email: useId(), titre: useId() };
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<LeadSent | null>(null);
  const inFlight = useRef(false);
  const phoneRef = useRef<HTMLInputElement>(null);

  if (sent || alreadySent) return <Confirmation context={context} sent={sent} />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    const telephone = normalizePhone(phone);
    if (!telephone) {
      setPhoneError(PHONE_ERROR);
      phoneRef.current?.focus();
      return;
    }
    const d = draft();
    if (!d) {
      setSubmitError("Il manque une information pour envoyer ta demande. Reviens à l'étape précédente.");
      return;
    }
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
          // Consentement publicitaire (bannière), distinct de l'opt-in e-mail.
          ad_consent: hasMarketingConsent(),
          simulation_id: d.simulation_id,
          identity: { email, first_name: firstName, phone: telephone },
          website,
          form: d.form,
          profile: d.profile,
          simulation: d.simulation,
          consent: { marketing_optin: consent, timestamp: new Date().toISOString(), policy_version: POLICY_VERSION },
          attribution: { ...attribution, lead_source: deriveLeadSource(attribution.first_touch), device: deviceType() },
          journey: { angle: getLandingAngle(), last_step: context },
        }),
      });
      if (!res.ok) {
        const erreur = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        if (erreur?.error === "invalid_phone") {
          setPhoneError(erreur.message ?? PHONE_ERROR);
          phoneRef.current?.focus();
          inFlight.current = false;
          return;
        }
        throw new Error(erreur?.message ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { leadId: string; dossierUrl?: string; emailSent?: boolean };
      setLeadId(data.leadId);
      trackEvent("lead_submitted");
      metaLead(context === "resultats" ? "simulateur_dossier" : "rappel_fourchette", metaEventId);
      const result: LeadSent = {
        leadId: data.leadId,
        dossierUrl: data.dossierUrl,
        emailSent: data.emailSent ?? false,
        firstName,
        phone: telephone,
        email,
      };
      setSent(result);
      onSent?.(result);
    } catch (err) {
      console.error("[lead] échec de l'envoi", err);
      setSubmitError("L'envoi n'a pas abouti. Tes réponses sont conservées : réessaie dans un instant.");
      inFlight.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} aria-labelledby={ids.titre} className="relative">
      <div className="flex items-center gap-3">
        <Image src="/ridha.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-full object-cover" />
        <div>
          <h2 id={ids.titre} className="text-lg font-extrabold leading-tight tracking-tight" style={{ color: INK }}>
            {context === "resultats" ? "Ridha vérifie ce calcul avec toi" : "Ridha vérifie ta fourchette avec toi"}
          </h2>
          <p className="text-sm" style={{ color: MUTED }}>
            Au téléphone, {DELAI_RAPPEL}. Gratuit, sans engagement.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor={ids.prenom} className="block text-sm font-bold" style={{ color: INK }}>
            Ton prénom
          </label>
          <input
            id={ids.prenom}
            className={`${INPUT} mt-1`}
            required
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={ids.tel} className="block text-sm font-bold" style={{ color: INK }}>
            Ton téléphone
          </label>
          <input
            id={ids.tel}
            ref={phoneRef}
            className={`${INPUT} mt-1`}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="06 12 34 56 78"
            required
            aria-invalid={phoneError ? true : undefined}
            aria-describedby={phoneError ? ids.telErreur : undefined}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (phoneError) setPhoneError(null);
            }}
            onBlur={() => {
              if (phone.trim() && !normalizePhone(phone)) setPhoneError(PHONE_ERROR);
            }}
          />
          {phoneError ? (
            <p id={ids.telErreur} role="alert" className="mt-1 text-sm font-semibold" style={{ color: ALERTE }}>
              {phoneError}
            </p>
          ) : (
            <p className="mt-1 text-xs" style={{ color: MUTED }}>
              Il ne sert qu&rsquo;à ce rappel.
            </p>
          )}
        </div>
        <div>
          <label htmlFor={ids.email} className="block text-sm font-bold" style={{ color: INK }}>
            Ton e-mail
          </label>
          <input
            id={ids.email}
            className={`${INPUT} mt-1`}
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="mt-1 text-xs" style={{ color: MUTED }}>
            {context === "resultats" ? "Pour recevoir ton dossier complet." : "Pour t'écrire si on ne te joint pas."}
          </p>
        </div>

        {/* Champ piège anti-robot : hors écran, hors tabulation, ignoré des lecteurs d'écran. */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
          <label>
            Site web
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
        </div>

        <label className="flex min-h-[44px] items-start gap-3 text-sm" style={{ color: MUTED }}>
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0 accent-[#0B0D12]"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            (Facultatif) Je veux aussi recevoir les conseils d&rsquo;optimisation de RD Portage : {SEQUENCE_NB_EMAILS} e-mails sur
            14 jours, désinscription en un clic.
          </span>
        </label>

        {submitError && (
          <p role="alert" className="text-sm font-semibold" style={{ color: ALERTE }}>
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#0B0D12] px-6 py-3 text-base font-extrabold text-white transition-colors hover:bg-[#2A2E38] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D57] focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {submitting ? "Envoi en cours…" : `Être rappelé ${DELAI_RAPPEL}`}
        </button>
        <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
          Nous utilisons ton téléphone pour te rappeler et ton e-mail pour t&rsquo;écrire au sujet de ta simulation.{" "}
          <a href="/confidentialite" className="underline underline-offset-2">
            Politique de confidentialité
          </a>
          .
        </p>
      </div>
    </form>
  );
}

/** Après l'envoi : ce qui va se passer, et quand (motif Ro, voir docs/cro/references-mobbin.md). */
function Confirmation({ context, sent }: { context: LeadContext; sent: LeadSent | null }) {
  const ref = useRef<HTMLDivElement>(null);
  // Le formulaire, plus haut, vient d'être remplacé : ramener la confirmation sous les yeux.
  useEffect(() => {
    if (!sent) return;
    const top = ref.current?.getBoundingClientRect().top ?? 0;
    if (top < 80) ref.current?.scrollIntoView({ block: "start" });
  }, [sent]);
  return (
    <div ref={ref} role="status" aria-live="polite" className="scroll-mt-20">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#2F6B4F" }}>
        Demande reçue
      </p>
      <h2 className="mt-1 text-xl font-extrabold leading-tight tracking-tight" style={{ color: INK }}>
        {sent ? `C'est noté, ${sent.firstName}.` : "C'est noté."}
      </h2>
      <p className="mt-1 text-base" style={{ color: MUTED }}>
        Ridha t&rsquo;appelle {DELAI_RAPPEL}
        {sent ? (
          <>
            {" "}
            au <strong className="whitespace-nowrap tabular-nums text-[#0B0D12]">{formatPhone(sent.phone)}</strong>
          </>
        ) : null}
        .
      </p>

      <ol className="mt-4 space-y-2 text-sm">
        {[
          ["Demande reçue", true],
          [`Appel de Ridha, ${DELAI_RAPPEL}`, false],
          ["Échange sur ta simulation, sans engagement", false],
        ].map(([label, fait], i) => (
          <li key={String(label)} className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={fait ? { backgroundColor: "#2F6B4F", color: "#fff" } : { border: "1px solid #D8DCE6", color: MUTED }}
            >
              {fait ? "✓" : i + 1}
            </span>
            <span style={{ color: fait ? INK : MUTED }}>{label}</span>
          </li>
        ))}
      </ol>

      {context === "resultats" && sent && (
        <p className="mt-4 rounded-xl px-3 py-2 text-sm leading-relaxed" style={{ backgroundColor: "#FFF1DE", color: MUTED }}>
          {sent.emailSent ? (
            <>
              Ton dossier part à <strong className="text-[#0B0D12]">{sent.email}</strong>.{" "}
            </>
          ) : null}
          Pas reçu d&rsquo;ici quelques minutes ? Regarde dans tes spams et ajoute <strong>{EMAIL_ENTREPRISE}</strong> à tes contacts.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {context === "resultats" && sent?.dossierUrl && (
          <a
            href={sent.dossierUrl}
            onClick={() => trackEvent("dossier_opened")}
            className="flex min-h-[48px] items-center justify-center rounded-full bg-[#0B0D12] px-6 py-3 text-base font-bold text-white"
          >
            Ouvrir mon dossier
          </a>
        )}
        <a
          href={`tel:${PHONE_E164}`}
          onClick={() => trackContact(`${context}_confirmation_tel`)}
          className="flex min-h-[48px] items-center justify-center rounded-full border border-[#D8DCE6] bg-white px-6 py-3 text-base font-bold text-[#0B0D12]"
        >
          Pressé ? Appeler le {PHONE_LABEL}
        </a>
      </div>
    </div>
  );
}
