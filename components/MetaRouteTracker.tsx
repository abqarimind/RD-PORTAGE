"use client";

/**
 * Fires a Meta PageView on first load and on every client-side route change.
 * Events are queued by the bridge until consent is granted, then flushed.
 * Renders null (and does nothing) when no Pixel ID is configured.
 */
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ensureMetaInit, metaPageView } from "@/lib/tracking/meta";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function MetaRouteTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!PIXEL_ID) return;
    ensureMetaInit();
    metaPageView({ path: pathname });
  }, [pathname]);
  return null;
}
