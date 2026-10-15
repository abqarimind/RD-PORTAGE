/**
 * Funnel event emission (client side):
 *  (a) Plausible — seuls les cinq événements qui sont des objectifs partent,
 *      avec `angle` et `utm_content` pour seules propriétés (analytics.ts) ;
 *      les métadonnées passées ici ne vont JAMAIS à Plausible ;
 *  (b) lead journal via /api/event when a lead_id exists.
 * GA4 is OPTIONAL and gated behind NEXT_PUBLIC_GA4_ENABLED + consent.
 */
import type { FunnelEventName } from "@/lib/crm/schema";
import { trackGoal } from "./analytics";
import { isPlausibleGoal } from "./analytics-rules";

declare global {
  interface Window {
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
  if (isPlausibleGoal(event)) trackGoal(event);
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
