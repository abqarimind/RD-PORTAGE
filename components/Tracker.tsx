"use client";

import { useEffect } from "react";
import { ALLOWED_QUERY_KEYS, isExcludedPath } from "@/lib/tracking/meta-rules";
import { captureUtm, withoutUnknownParams } from "@/lib/tracking/utm";

/**
 * Une fois par chargement de page : capture des UTM et du fbclid (session),
 * puis retrait des paramètres d'URL inconnus. La capture vient AVANT le
 * nettoyage, et les UTM font partie des paramètres autorisés : l'attribution
 * n'est jamais perdue. Les pages exclues (/dossier…) ne sont pas touchées :
 * leur lien signé doit rester intact.
 */
export function Tracker() {
  useEffect(() => {
    captureUtm();
    if (isExcludedPath(window.location.pathname)) return;
    const clean = withoutUnknownParams(window.location.href, ALLOWED_QUERY_KEYS);
    if (clean) window.history.replaceState(window.history.state, "", clean);
  }, []);
  return null;
}
