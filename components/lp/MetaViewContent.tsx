"use client";

/**
 * Affichage d'une landing : mémorise l'angle d'arrivée de la session (lead,
 * objectifs Plausible) et envoie le ViewContent Meta, une fois par affichage,
 * avec content_name seul (mis en attente du consentement comme le PageView).
 */
import { useEffect } from "react";
import { rememberLandingAngle } from "@/lib/tracking/journey";
import { metaViewContent } from "@/lib/tracking/meta";

export function MetaViewContent({ contentName }: { contentName: string }) {
  useEffect(() => {
    rememberLandingAngle(contentName);
    metaViewContent(contentName);
  }, [contentName]);
  return null;
}
