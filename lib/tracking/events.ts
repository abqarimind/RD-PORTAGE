/**
 * Funnel event emission (client side): (a) Plausible custom event,
 * (b) lead journal via /api/event when a lead_id exists.
 * GA4 is OPTIONAL and gated behind NEXT_PUBLIC_GA4_ENABLED + consent.
 */
import type { FunnelEventName } from "@/lib/crm/schema";

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string | number> }) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

const LEAD_ID_KEY = "rdp_lead_id";

export function setLeadId(leadId: string) {
  try {
    localStorage.setItem(LEAD_ID_KEY, leadId);
  } catch {}
}

export function getLeadId(): string | null {
  try {
    return localStorage.getItem(LEAD_ID_KEY);
  } catch {
    return null;
  }
}

export function trackEvent(event: FunnelEventName, metadata?: Record<string, string | number>) {
  // (a) analytics
  window.plausible?.(event, metadata ? { props: metadata } : undefined);
  if (process.env.NEXT_PUBLIC_GA4_ENABLED === "true") {
    window.gtag?.("event", event, metadata ?? {});
  }
  // (b) lead journal — only once the lead exists server-side
  const leadId = getLeadId();
  if (leadId) {
    void fetch("/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ leadId, event, metadata, timestamp: new Date().toISOString() }),
      keepalive: true,
    }).catch(() => {});
  }
}
