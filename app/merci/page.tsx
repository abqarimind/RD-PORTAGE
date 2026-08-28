"use client";

/**
 * Post-submission confirmation. Fires the browser Pixel Lead from the
 * event_id stored at submit time — deduplicated against the server-side
 * CAPI Lead (sent by /api/lead) via the shared event_id. Idempotent: a
 * direct visit without a stored id simply shows the confirmation.
 *
 * Next step = book the 30-min Diagnostic. The call CTA fires Contact;
 * a real booking tool (when NEXT_PUBLIC_RDV_URL is set) fires Schedule.
 */
import Link from "next/link";
import { useEffect } from "react";
import { trackEvent } from "@/lib/tracking/events";
import { ensureMetaInit, metaContact, metaLead, metaSchedule } from "@/lib/tracking/meta";

const RDV_URL = process.env.NEXT_PUBLIC_RDV_URL;
const PHONE = "+33632988723";
const PHONE_LABEL = "06 32 98 87 23";
const LEAD_EVENT_ID_KEY = "rdp_meta_lead_eid";

export default function MerciPage() {
  useEffect(() => {
    ensureMetaInit();
    try {
      const eventId = localStorage.getItem(LEAD_EVENT_ID_KEY);
      if (eventId) metaLead(eventId);
    } catch {
      /* no stored id — nothing to fire */
    }
  }, []);

  const onBook = () => {
    trackEvent("rdv_clicked", { from: "merci" });
    if (RDV_URL) metaSchedule({ from: "merci" });
    else metaContact({ from: "merci" });
  };

  return (
    <main className="bg-creme text-encre">
      <div className="mx-auto max-w-page px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-widest text-laiton">Bien reçu</p>
        <h1 className="display mt-3 max-w-2xl text-3xl leading-tight md:text-4xl">
          Votre simulation détaillée est en route.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-encre/80">
          Vous allez recevoir par email le détail de vos 3 scénarios, calculé sur votre foyer réel. Dernière étape : validez votre
          chiffre avec Ridha lors d&rsquo;un Diagnostic de 30 minutes — proposition ferme, signature possible sous 48 h.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href={RDV_URL ?? `tel:${PHONE}`}
            onClick={onBook}
            className="cta-primary text-center"
          >
            {RDV_URL ? "Réserver mon Diagnostic 30 min" : `Appeler Ridha — ${PHONE_LABEL}`}
          </a>
          <Link
            href="/"
            className="rounded border border-nuit px-6 py-3 text-center font-sans text-base text-nuit transition hover:bg-nuit hover:text-creme"
          >
            Revenir à l&rsquo;accueil
          </Link>
        </div>
        <p className="mt-10 text-xs text-encre/50">
          Simulation à valeur indicative — ne constitue pas un conseil fiscal personnalisé.
        </p>
      </div>
    </main>
  );
}
