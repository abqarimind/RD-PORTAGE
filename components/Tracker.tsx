"use client";

import { useEffect } from "react";
import { captureUtm } from "@/lib/tracking/utm";
import { trackEvent } from "@/lib/tracking/events";

/** Captures UTM cookies and emits page_view once per page load. */
export function Tracker() {
  useEffect(() => {
    captureUtm();
    trackEvent("page_view", { path: window.location.pathname });
  }, []);
  return null;
}
