/**
 * Cookie-consent state for marketing trackers (Meta Pixel + CAPI).
 * The privacy-first analytics (Plausible) stay cookieless and run without
 * consent; only the Meta pixel is gated here, per RGPD.
 */
export type ConsentState = "granted" | "denied";

const CONSENT_COOKIE = "rdp_consent";
const ONE_HUNDRED_EIGHTY_DAYS = 180 * 24 * 3600;
export const CONSENT_EVENT = "rdp-consent-change";

export function getConsent(): ConsentState | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )rdp_consent=([^;]*)/);
  const v = m ? decodeURIComponent(m[1]) : null;
  return v === "granted" || v === "denied" ? v : null;
}

export function setConsent(state: ConsentState): void {
  if (typeof document === "undefined") return;
  document.cookie = `${CONSENT_COOKIE}=${state}; max-age=${ONE_HUNDRED_EIGHTY_DAYS}; path=/; samesite=lax`;
  window.dispatchEvent(new CustomEvent<ConsentState>(CONSENT_EVENT, { detail: state }));
}

export function hasMarketingConsent(): boolean {
  return getConsent() === "granted";
}

/** Subscribe to consent changes; returns an unsubscribe fn. */
export function onConsentChange(cb: (state: ConsentState) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => cb((e as CustomEvent<ConsentState>).detail);
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}
