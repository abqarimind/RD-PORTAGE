/**
 * Meta Conversions API (CAPI) — envoi serveur. PRÉPARÉ, NON ACTIVÉ.
 *
 * No-op tant que META_CAPI_ENABLED !== "true" ET qu'aucun token serveur
 * (META_CAPI_TOKEN) n'est défini. Voir docs/meta-capi.md pour l'activation.
 *
 * Garde-fous identiques au Pixel (lib/tracking/meta-rules.ts) : événements
 * et paramètres en liste blanche, URL source vérifiée. Pas de correspondance
 * avancée : les helpers de hachage ci-dessous sont conservés pour une
 * décision ultérieure, mais aucun email ni téléphone n'est envoyé.
 */
import { createHash } from "node:crypto";
import { isMetaEvent, isUrlSafeForMeta, sanitizeParams } from "@/lib/tracking/meta-rules";

const DEFAULT_GRAPH_VERSION = "v19.0";

function pixelId(): string {
  return process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID || "4019768748330072";
}
/** Token serveur, jamais exposé au navigateur ni versionné. Ancien nom accepté. */
function accessToken(): string | undefined {
  return process.env.META_CAPI_TOKEN || process.env.META_CAPI_ACCESS_TOKEN || undefined;
}
export function isCapiEnabled(): boolean {
  return process.env.META_CAPI_ENABLED === "true" && Boolean(accessToken());
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

/** Pas d'email ni de téléphone : correspondance avancée non retenue pour l'instant. */
export interface CapiUserData {
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
  const token = accessToken();
  if (!isCapiEnabled() || !token) return { sent: false, reason: "capi_disabled" };
  if (!isMetaEvent(event.eventName)) return { sent: false, reason: "unknown_event" };
  const id = pixelId();
  const sourceUrl = event.eventSourceUrl && isUrlSafeForMeta(event.eventSourceUrl) ? event.eventSourceUrl : undefined;

  const u = event.userData ?? {};
  const userData: Record<string, unknown> = {};
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
        ...(sourceUrl ? { event_source_url: sourceUrl } : {}),
        user_data: userData,
        custom_data: sanitizeParams(event.customData),
      },
    ],
  };
  // Token dans le corps et non dans l'URL : il ne finit pas dans les journaux d'accès.
  payload.access_token = token;
  const testCode = process.env.META_CAPI_TEST_EVENT_CODE;
  if (testCode) payload.test_event_code = testCode;

  const version = process.env.META_GRAPH_VERSION ?? DEFAULT_GRAPH_VERSION;
  try {
    const res = await fetch(
      `https://graph.facebook.com/${version}/${id}/events`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) },
    );
    if (!res.ok) return { sent: false, reason: `graph_${res.status}` };
    return { sent: true };
  } catch {
    // Tracking must never break the lead flow.
    return { sent: false, reason: "network_error" };
  }
}
