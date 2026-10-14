"use client";

/**
 * Droit d'opposition à la mesure d'audience exemptée (CNIL) : un bouton qui
 * exclut cet appareil de Plausible, et le rétablit. Le choix est vérifié
 * avant chaque envoi (transformRequest, app/layout.tsx).
 */
import { useEffect, useState } from "react";
import { isAnalyticsOptedOut, setAnalyticsOptOut } from "@/lib/tracking/analytics";

export function AnalyticsOptOut() {
  const [optedOut, setOptedOut] = useState<boolean | null>(null);
  useEffect(() => setOptedOut(isAnalyticsOptedOut()), []);
  if (optedOut === null) return null;
  return (
    <p className="flex flex-wrap items-center gap-3">
      <span>{optedOut ? "Cet appareil est exclu de la mesure d'audience." : "Cet appareil est compté dans la mesure d'audience anonyme."}</span>
      <button
        type="button"
        className="inline-flex min-h-[44px] items-center rounded-full border border-[#D8DCE6] px-4 text-sm font-bold text-[#0B0D12] hover:border-[#B08D57]"
        onClick={() => {
          setAnalyticsOptOut(!optedOut);
          setOptedOut(!optedOut);
        }}
      >
        {optedOut ? "Être de nouveau compté" : "Ne pas être compté"}
      </button>
    </p>
  );
}
