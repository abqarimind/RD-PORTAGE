"use client";

/**
 * Bannière de consentement (CNIL) pour le Pixel Meta.
 *
 * - Refuser est aussi simple et aussi visible qu'Accepter : mêmes boutons,
 *   même taille, même couleur, côte à côte ; « Personnaliser » ouvre le
 *   détail par catégorie.
 * - COMPACTE (14/10) : sur mobile, l'ancienne version occupait 40 à 50 % de
 *   l'écran et recouvrait la première question du diagnostic. Une phrase,
 *   deux boutons, une barre basse d'environ 120 px sur un écran de 375 px.
 * - Le choix est mémorisé (lib/tracking/consent.ts) et modifiable à tout
 *   moment via « Gérer les cookies » dans le pied de page.
 * - Rien n'est chargé chez Meta tant que l'utilisateur n'a pas accepté.
 * Rendue quand le Pixel est actif (production, ou drapeau de debug), et sur
 * les Preview Vercel, où le choix est enregistré sans que rien ne parte.
 */
import { useEffect, useId, useRef, useState } from "react";
import { CONSENT_OPEN_EVENT, getConsent, openConsentSettings, setConsent } from "@/lib/tracking/consent";
import { CONSENT_UI_ENABLED, ensureMetaInit } from "@/lib/tracking/meta";

const SANS = "'Manrope','IBM Plex Sans',sans-serif";
/** Refuser et Accepter partagent exactement ce style : même poids visuel (CNIL). */
const BTN_CHOICE =
  "min-h-[44px] rounded-full bg-[#0B0D12] px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-[#2A2E38] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D57] focus-visible:ring-offset-2";
const BTN_SECONDARY =
  "min-h-[44px] rounded-full border border-[#D8DCE6] bg-white px-5 py-2 text-sm font-bold text-[#0B0D12] transition-colors hover:border-[#B08D57] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D57] focus-visible:ring-offset-2";
const LINK = "inline-flex min-h-[44px] items-center underline underline-offset-2";

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
    if (!CONSENT_UI_ENABLED) return;
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

  if (!CONSENT_UI_ENABLED || !open) return null;

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
      data-testid="consent-banner"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#ECEEF3] bg-white px-4 py-3 text-[#0B0D12] shadow-[0_-8px_24px_rgba(11,13,18,0.08)] focus:outline-none"
      style={{ fontFamily: SANS }}
    >
      <div className="mx-auto max-w-page">
        <p className="text-[13px] leading-snug text-[#4A5061]">
          <strong id={titleId} className="font-bold text-[#0B0D12]">
            Cookies publicitaires.
          </strong>{" "}
          Avec votre accord, le pixel Meta mesure l&rsquo;efficacité de nos publicités. Aucune donnée de votre simulation ne
          lui est transmise.{" "}
          <a href="/confidentialite" className="underline underline-offset-2">
            En savoir plus
          </a>
        </p>

        {details && (
          <div className="mt-3 space-y-3 rounded-2xl border border-[#ECEEF3] bg-[#FAFBFD] p-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold">Mesure d&rsquo;audience anonyme</p>
                <p className="text-xs leading-relaxed text-[#4A5061]">
                  Plausible, sans cookie ni profilage. Toujours active ; vous pouvez vous y opposer depuis la politique de
                  confidentialité.
                </p>
              </div>
              <span className="shrink-0 text-xs font-bold">Toujours active</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <label htmlFor={toggleId}>
                <span className="block font-bold">Publicité (Meta)</span>
                <span className="block text-xs leading-relaxed text-[#4A5061]">
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

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="grid flex-1 grid-cols-2 gap-2 sm:flex-none">
            <button type="button" onClick={() => decide(false)} className={BTN_CHOICE}>
              {details ? "Tout refuser" : "Refuser"}
            </button>
            <button type="button" onClick={() => decide(true)} className={BTN_CHOICE}>
              {details ? "Tout accepter" : "Accepter"}
            </button>
          </div>
          {details ? (
            <button type="button" onClick={() => decide(marketing)} className={BTN_SECONDARY}>
              Enregistrer mes choix
            </button>
          ) : (
            <button type="button" onClick={() => setDetails(true)} className={`${LINK} text-[13px] text-[#4A5061]`}>
              Personnaliser
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Lien « Gérer les cookies » du pied de page : rouvre la bannière, choix modifiable à tout moment. */
export function ConsentSettingsLink({ className }: { className?: string }) {
  if (!CONSENT_UI_ENABLED) return null;
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
