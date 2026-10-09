"use client";

/**
 * Bannière de consentement (CNIL) pour le Pixel Meta.
 *
 * - Refuser est aussi simple et aussi visible qu'Accepter (même niveau, même
 *   taille) ; « Personnaliser » ouvre le détail par catégorie.
 * - Le choix est mémorisé (lib/tracking/consent.ts) et modifiable à tout
 *   moment via « Gérer les cookies » dans le pied de page.
 * - Rien n'est chargé chez Meta tant que l'utilisateur n'a pas accepté.
 * Rendue seulement quand le Pixel est actif (production, ou debug local).
 */
import { useEffect, useId, useRef, useState } from "react";
import { CONSENT_OPEN_EVENT, getConsent, openConsentSettings, setConsent } from "@/lib/tracking/consent";
import { ensureMetaInit, META_ENABLED } from "@/lib/tracking/meta";

const BTN =
  "min-h-[44px] rounded border px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-laiton";
const BTN_CHOICE = `${BTN} border-nuit bg-nuit text-creme hover:bg-laiton hover:text-encre hover:border-laiton`;
const BTN_SECONDARY = `${BTN} border-laiton/70 hover:bg-laiton/10`;

export function ConsentBanner() {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const titleId = useId();
  const toggleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  /** Le focus n'est déplacé que sur réouverture volontaire, jamais au chargement. */
  const [focusRequest, setFocusRequest] = useState(0);

  useEffect(() => {
    if (!META_ENABLED) return;
    ensureMetaInit();
    setOpen(getConsent() === null);
    const reopen = () => {
      setMarketing(getConsent() === "granted");
      setDetails(true);
      setOpen(true);
      setFocusRequest((n) => n + 1);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  useEffect(() => {
    if (focusRequest > 0) panelRef.current?.focus();
  }, [focusRequest]);

  if (!META_ENABLED || !open) return null;

  const decide = (granted: boolean) => {
    setConsent(granted ? "granted" : "denied");
    setOpen(false);
    setDetails(false);
  };

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-laiton bg-creme px-4 py-4 text-encre shadow-[0_-8px_24px_rgba(0,0,0,0.08)] focus:outline-none"
    >
      <div className="mx-auto max-w-page">
        <p id={titleId} className="text-sm font-semibold">
          Cookies publicitaires
        </p>
        <p className="mt-1 text-sm leading-relaxed">
          Avec votre accord, nous utilisons le pixel Meta (Facebook, Instagram) pour mesurer l&rsquo;efficacité de nos
          publicités. Aucune donnée de votre simulation ne lui est transmise. Refuser n&rsquo;a aucun impact sur le
          simulateur.{" "}
          <a href="/confidentialite" className="underline">
            En savoir plus
          </a>
          .
        </p>

        {details && (
          <div className="mt-3 space-y-3 rounded border border-laiton/40 bg-white/60 p-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">Mesure d&rsquo;audience anonyme</p>
                <p className="text-xs leading-relaxed">Plausible, sans cookie ni profilage. Toujours active.</p>
              </div>
              <span className="shrink-0 text-xs font-medium">Toujours active</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <label htmlFor={toggleId}>
                <span className="block font-semibold">Publicité (Meta)</span>
                <span className="block text-xs leading-relaxed">
                  Pixel Meta : mesure des campagnes Facebook et Instagram. Désactivé par défaut.
                </span>
              </label>
              <input
                id={toggleId}
                type="checkbox"
                role="switch"
                aria-checked={marketing}
                className="mt-1 h-5 w-5 shrink-0 accent-[#0B0D12]"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
              />
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {details ? (
            <>
              <button type="button" onClick={() => decide(false)} className={BTN_CHOICE}>
                Tout refuser
              </button>
              <button type="button" onClick={() => decide(marketing)} className={BTN_SECONDARY}>
                Enregistrer mes choix
              </button>
              <button type="button" onClick={() => decide(true)} className={BTN_CHOICE}>
                Tout accepter
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => decide(false)} className={BTN_CHOICE}>
                Refuser
              </button>
              <button type="button" onClick={() => setDetails(true)} className={BTN_SECONDARY}>
                Personnaliser
              </button>
              <button type="button" onClick={() => decide(true)} className={BTN_CHOICE}>
                Accepter
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Lien « Gérer les cookies » du pied de page : rouvre la bannière, choix modifiable à tout moment. */
export function ConsentSettingsLink({ className }: { className?: string }) {
  if (!META_ENABLED) return null;
  return (
    <button
      type="button"
      className={className}
      onClick={openConsentSettings}
    >
      Gérer les cookies
    </button>
  );
}
