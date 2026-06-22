/**
 * Meta Conversions API (CAPI) — server-side event sender.
 *
 * Best practice 2026: every browser-Pixel event is mirrored here with the
 * SAME event_name + event_id so Meta deduplicates (else double counting),
 * and PII is SHA-256 hashed for match quality. Secrets stay server-side.
 *
 * Degrades to a no-op when META_PIXEL_ID / META_CAPI_ACCESS_TOKEN are unset
 * (mock mode), so the funnel runs end-to-end without any Meta credentials.
 */
import { createHash } from "node:crypto";

const DEFAULT_GRAPH_VERSION = "v19.0";

function pixelId(): string | undefined {
  return process.env.META_PIXEL_ID ?? process.env.NEXT_PUBLIC_META_PIXEL_ID;
}
function accessToken(): string | undefined {
  return process.env.META_CAPI_ACCESS_TOKEN;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Meta normalisation: trim + lowercase, no surrounding whitespace. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Meta normalisation: digits only, French local numbers prefixed with 33. */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `33${digits.slice(1)}`;
  return digits;
}

export function hashEmail(email?: string): string[] | undefined {
  return email ? [sha256(normalizeEmail(email))] : undefined;
}
export function hashPhone(phone?: string): string[] | undefined {
  return phone ? [sha256(normalizePhone(phone))] : undefined;
}

export interface CapiUserData {
  /** Raw email — hashed here, never stored. */
  email?: string;
  /** Raw phone — hashed here, never stored. */
  phone?: string;
  fbp?: string;
  fbc?: string;
  clientIp?: string;
  userAgent?: string;
}

export interface CapiEvent {
  eventName: string;
  eventId: string;
  eventSourceUrl?: string;
  actionSource?: "website" | "phone_call" | "system_generated";
  customData?: Record<string, unknown>;
  userData?: CapiUserData;
}

export interface CapiResult {
  sent: boolean;
  reason?: string;
}

export async function sendCapiEvent(event: CapiEvent): Promise<CapiResult> {
  const id = pixelId();
  const token = accessToken();
  if (!id || !token) return { sent: false, reason: "capi_disabled" };

  const u = event.userData ?? {};
  const userData: Record<string, unknown> = {};
  const em = hashEmail(u.email);
  if (em) userData.em = em;
  const ph = hashPhone(u.phone);
  if (ph) userData.ph = ph;
  if (u.fbp) userData.fbp = u.fbp;
  if (u.fbc) userData.fbc = u.fbc;
  if (u.clientIp) userData.client_ip_address = u.clientIp;
  if (u.userAgent) userData.client_user_agent = u.userAgent;

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: event.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: event.eventId,
        action_source: event.actionSource ?? "website",
        ...(event.eventSourceUrl ? { event_source_url: event.eventSourceUrl } : {}),
        user_data: userData,
        custom_data: event.customData ?? {},
      },
    ],
  };
  const testCode = process.env.META_CAPI_TEST_EVENT_CODE;
  if (testCode) payload.test_event_code = testCode;

  const version = process.env.META_GRAPH_VERSION ?? DEFAULT_GRAPH_VERSION;
  try {
    const res = await fetch(
      `https://graph.facebook.com/${version}/${id}/events?access_token=${encodeURIComponent(token)}`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) },
    );
    if (!res.ok) return { sent: false, reason: `graph_${res.status}` };
    return { sent: true };
  } catch {
    // Tracking must never break the lead flow.
    return { sent: false, reason: "network_error" };
  }
}
