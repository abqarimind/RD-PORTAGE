"use client";

/**
 * RGPD cookie banner for the Meta pixel. Renders only when a Pixel ID is
 * configured AND the visitor hasn't decided yet. Accepting loads the pixel
 * and flushes any queued events (PageView/ViewContent fired before consent).
 * Plausible stays cookieless and is unaffected.
 */
import { useEffect, useState } from "react";
import { getConsent, setConsent } from "@/lib/tracking/consent";
import { ensureMetaInit } from "@/lib/tracking/meta";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function ConsentBanner() {
  const [decided, setDecided] = useState(true);

  useEffect(() => {
    ensureMetaInit();
    setDecided(getConsent() !== null);
  }, []);

  if (!PIXEL_ID || decided) return null;

  const decide = (granted: boolean) => {
    setConsent(granted ? "granted" : "denied");
    setDecided(true);
  };

  return (
    <div
      role="dialog"
      aria-label="Consentement aux cookies de mesure"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-laiton bg-creme px-4 py-4 text-encre shadow-[0_-8px_24px_rgba(0,0,0,0.08)]"
    >
      <div className="mx-auto flex max-w-page flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm leading-relaxed">
          Nous utilisons un cookie de mesure publicitaire (Meta) pour évaluer nos campagnes. La mesure d&rsquo;audience interne
          reste anonyme et sans cookie. Vous pouvez refuser sans impact sur le simulateur.{" "}
          <a href="/confidentialite" className="underline">
            En savoir plus
          </a>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => decide(false)}
            className="rounded border border-laiton/70 px-4 py-2 text-sm font-medium transition hover:bg-laiton/10"
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={() => decide(true)}
            className="rounded bg-nuit px-4 py-2 text-sm font-medium text-creme transition hover:bg-laiton hover:text-encre"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
