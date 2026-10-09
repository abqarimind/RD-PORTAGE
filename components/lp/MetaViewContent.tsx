"use client";

/** ViewContent Meta, une fois par affichage de landing, avec content_name seul. */
import { useEffect } from "react";
import { metaViewContent } from "@/lib/tracking/meta";

export function MetaViewContent({ contentName }: { contentName: string }) {
  useEffect(() => {
    metaViewContent(contentName);
  }, [contentName]);
  return null;
}
