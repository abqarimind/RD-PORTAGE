/**
 * Meta tracking bridge (browser) — fires every event on BOTH the browser
 * Pixel and the server Conversions API (via /api/capi) with a SHARED
 * event_id so Meta deduplicates. Same event_name + event_id on both
 * channels is the 2026 best practice (≈ −17.8 % cost/result vs Pixel only).
 *
 * - Consent-gated (RGPD): nothing fires until rdp_consent === "granted".
 *   Events requested before consent are queued and flushed on grant.
 * - Standard events use fbq('track'); customs use fbq('trackCustom').
 * - PII (email/phone) is hashed SERVER-SIDE in /api/capi and /api/lead.
 */
import { hasMarketingConsent, onConsentChange } from "./consent";
import { getStoredFbclid } from "./utm";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/** Meta standard events use fbq('track'); everything else is custom. */
const STANDARD_EVENTS = new Set(["PageView", "ViewContent", "Lead", "Schedule", "Contact", "CompleteRegistration"]);

export type MetaUserData = { email?: string; phone?: string };

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export function newEventId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `e-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

let pixelLoaded = false;
let initialised = false;
const pending: Array<() => void> = [];

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

function getFbp(): string | undefined {
  return readCookie("_fbp");
}

/** _fbc cookie when present; otherwise reconstructed from the stored fbclid. */
function getFbc(): string | undefined {
  const cookie = readCookie("_fbc");
  if (cookie) return cookie;
  const fbclid = getStoredFbclid();
  return fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined;
}

function loadPixel(): void {
  if (pixelLoaded || !PIXEL_ID || typeof window === "undefined" || typeof document === "undefined") return;
  if (!window.fbq) {
    const queue: unknown[] = [];
    const fbq = (...args: unknown[]) => {
      const f = fbq as unknown as { callMethod?: (...a: unknown[]) => void };
      if (f.callMethod) f.callMethod(...args);
      else queue.push(args);
    };
    const meta = fbq as unknown as Record<string, unknown>;
    meta.queue = queue;
    meta.loaded = true;
    meta.version = "2.0";
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  // No auto PageView — we fire it ourselves with an event_id so the CAPI
  // copy deduplicates.
  window.fbq?.("init", PIXEL_ID);
  pixelLoaded = true;
}

function flush(): void {
  loadPixel();
  while (pending.length) {
    const job = pending.shift();
    job?.();
  }
}

/** Wire the consent listener once (called from layout-level components). */
export function ensureMetaInit(): void {
  if (initialised || typeof window === "undefined" || !PIXEL_ID) return;
  initialised = true;
  if (hasMarketingConsent()) flush();
  onConsentChange((state) => {
    if (state === "granted") flush();
  });
}

interface TrackOpts {
  eventId?: string;
  custom?: Record<string, unknown>;
  userData?: MetaUserData;
  /** Skip the /api/capi forward (used for Lead, whose CAPI copy is sent by /api/lead). */
  skipCapi?: boolean;
}

function sendToCapi(eventName: string, eventId: string, opts: TrackOpts): void {
  if (!PIXEL_ID || typeof window === "undefined") return;
  const body = JSON.stringify({
    event_name: eventName,
    event_id: eventId,
    event_source_url: window.location.href,
    custom_data: opts.custom ?? {},
    user_data: { em: opts.userData?.email, ph: opts.userData?.phone, fbp: getFbp(), fbc: getFbc() },
  });
  void fetch("/api/capi", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

/** Fire one Meta event on both Pixel + CAPI with a shared event_id. */
export function metaTrack(eventName: string, opts: TrackOpts = {}): string {
  const eventId = opts.eventId ?? newEventId();
  const run = () => {
    const isStandard = STANDARD_EVENTS.has(eventName);
    if (PIXEL_ID && typeof window !== "undefined" && window.fbq) {
      window.fbq(isStandard ? "track" : "trackCustom", eventName, opts.custom ?? {}, { eventID: eventId });
    }
    if (!opts.skipCapi) sendToCapi(eventName, eventId, opts);
  };
  if (hasMarketingConsent()) run();
  else pending.push(run);
  return eventId;
}

/* —————————————————— convenience wrappers (funnel events) —————————————————— */

export const metaPageView = (custom?: Record<string, unknown>) => metaTrack("PageView", { custom });
export const metaViewContent = (contentName: string) => metaTrack("ViewContent", { custom: { content_name: contentName } });
export const metaDiagnosticStart = (angle?: string) => metaTrack("DiagnosticStart", { custom: angle ? { angle } : {} });
export const metaDiagnosticComplete = (custom?: Record<string, unknown>) => metaTrack("DiagnosticComplete", { custom });
export const metaSimulateurStart = () => metaTrack("SimulateurStart");
export const metaSimulateurComplete = (custom?: Record<string, unknown>) => metaTrack("SimulateurComplete", { custom });
/** Browser Pixel Lead only; the authoritative CAPI Lead is sent by /api/lead. */
export const metaLead = (eventId: string, userData?: MetaUserData, custom?: Record<string, unknown>) =>
  metaTrack("Lead", { eventId, userData, custom, skipCapi: true });
export const metaSchedule = (custom?: Record<string, unknown>) => metaTrack("Schedule", { custom });
export const metaContact = (custom?: Record<string, unknown>) => metaTrack("Contact", { custom });
