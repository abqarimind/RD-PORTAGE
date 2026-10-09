"use client";

/**
 * Un seul PageView Meta par changement de route (App Router = SPA).
 * Avant consentement, le PageView de la page en cours est mis en attente et
 * part à l'acceptation ; rien d'autre n'est conservé. Pages exclues
 * (/dossier, /confidentialite, /mentions-legales) : aucun envoi.
 */
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackPageView } from "@/lib/tracking/meta";

export function MetaRouteTracker() {
  const pathname = usePathname();
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);
  return null;
}
