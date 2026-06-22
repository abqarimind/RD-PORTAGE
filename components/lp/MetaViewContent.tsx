"use client";

/** Fires a Meta ViewContent once on mount (queued until consent). */
import { useEffect } from "react";
import { ensureMetaInit, metaViewContent } from "@/lib/tracking/meta";

export function MetaViewContent({ contentName }: { contentName: string }) {
  useEffect(() => {
    ensureMetaInit();
    metaViewContent(contentName);
  }, [contentName]);
  return null;
}
