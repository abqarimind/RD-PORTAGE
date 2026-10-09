/**
 * Pixel Meta (navigateur) — module unique, conforme CNIL.
 *
 * - RIEN ne part avant le consentement « publicité » : le script Meta n'est
 *   même pas téléchargé tant que rdp_consent !== "granted". À l'acceptation :
 *   consent revoke → init → consent grant, puis le PageView de la page en
 *   cours. Tout autre événement survenu avant le consentement est abandonné,
 *   jamais rejoué (pas de Lead a posteriori).
 * - Retrait du consentement : fbq('consent', 'revoke') + suppression des
 *   cookies _fbp / _fbc.
 * - Chaque événement porte un event_id unique (déduplication future avec
 *   l'API Conversions, voir docs/meta-capi.md). Rien n'est relayé côté
 *   serveur depuis le navigateur.
 * - Paramètres filtrés par liste blanche, URL vérifiée avant chaque envoi
 *   (lib/tracking/meta-rules.ts) : aucune donnée financière ou familiale ne
 *   peut atteindre Meta, ni en paramètre ni dans l'URL.
 * - Pas de correspondance avancée (ni email ni téléphone, même hachés).
 * - Configuration automatique et PageView automatiques sur pushState
 *   désactivés : seuls les événements explicites ci-dessous partent.
 */
import { hasMarketingConsent, onConsentChange } from "./consent";
import {
  isPixelEnabled,
  isStandardEvent,
  isUrlSafeForMeta,
  sanitizeParams,
  type MetaEventName,
  type MetaParams,
} from "./meta-rules";

/** Pixel « RD Portage - Pixel simulateur ». Surcharge possible par variable publique. */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "4019768748330072";

export const META_ENABLED = isPixelEnabled({
  nodeEnv: process.env.NODE_ENV,
  pixelId: META_PIXEL_ID,
  debug: process.env.NEXT_PUBLIC_META_PIXEL_DEBUG,
});

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  push?: unknown;
  loaded?: boolean;
  version?: string;
  disablePushState?: boolean;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: unknown;
  }
}

export function newEventId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    /* repli ci-dessous */
  }
  return `e-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

let pixelReady = false;
let listening = false;
/** Seul événement conservé avant consentement : le PageView de la page en cours. */
let pendingPageView: { path: string; eventId: string } | null = null;
/** Dernier chemin ayant reçu un PageView (anti-doublon StrictMode / re-rendus). */
let lastPageViewPath: string | null = null;
/** Clés « une seule fois » déjà consommées (portée session). */
const onceMemory = new Set<string>();
/** Clés « une seule fois » de la page affichée, vidées à chaque changement de route. */
const pageOnce = new Set<string>();

const browser = () => typeof window !== "undefined" && typeof document !== "undefined";

/**
 * Snippet officiel Meta, réécrit pour TypeScript, sans <noscript>.
 * Séquence : consent revoke → init, puis consent grant UNE FOIS fbevents.js
 * chargé (un grant mis en file avant le chargement reste bloqué derrière le
 * revoke : la file n'est jamais vidée). Les événements envoyés entre-temps
 * sont retenus par Meta jusqu'au grant.
 */
function loadPixel(): void {
  if (pixelReady || !browser()) return;
  pixelReady = true;
  // Revérifié au moment du grant : un retrait survenu pendant le chargement l'emporte.
  const grant = () => {
    if (hasMarketingConsent()) window.fbq?.("consent", "grant");
  };
  if (window.fbq?.callMethod) {
    window.fbq("consent", "revoke");
    window.fbq("set", "autoConfig", false, META_PIXEL_ID);
    window.fbq("init", META_PIXEL_ID);
    grant();
    return;
  }
  const n = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args);
    else n.queue!.push(args);
  } as Fbq;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  // SPA : nous envoyons nous-mêmes un seul PageView par changement de route.
  n.disablePushState = true;
  window.fbq = n;
  if (!window._fbq) window._fbq = n;
  n("consent", "revoke");
  // Pas de collecte automatique (clics de boutons, métadonnées de page).
  n("set", "autoConfig", false, META_PIXEL_ID);
  n("init", META_PIXEL_ID);
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  script.onload = grant;
  const first = document.getElementsByTagName("script")[0];
  if (first?.parentNode) first.parentNode.insertBefore(script, first);
  else document.head.appendChild(script);
}

/**
 * Charge le Pixel si le consentement est donné ET que l'URL courante peut
 * être vue par Meta (page non exclue, aucun paramètre hors liste blanche).
 */
function maybeLoadPixel(): void {
  if (pixelReady || !hasMarketingConsent() || !isUrlSafeForMeta(window.location.href)) return;
  loadPixel();
}

function currentPath(): string {
  return browser() ? window.location.pathname : "";
}

function send(event: MetaEventName, params: MetaParams, eventId: string): boolean {
  if (!pixelReady || !window.fbq || !hasMarketingConsent()) return false;
  if (!isUrlSafeForMeta(window.location.href)) return false;
  window.fbq(isStandardEvent(event) ? "track" : "trackCustom", event, params, { eventID: eventId });
  return true;
}

function onGrant(): void {
  // Re-consentement après un retrait sur la même page : le Pixel est déjà là.
  if (pixelReady) window.fbq?.("consent", "grant");
  else maybeLoadPixel();
  const pv = pendingPageView;
  pendingPageView = null;
  // Le PageView en attente ne part que si l'utilisateur est toujours sur la même page.
  if (pv && pv.path === currentPath()) send("PageView", {}, pv.eventId);
}

function deleteMetaCookies(): void {
  const host = window.location.hostname;
  const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const name of ["_fbp", "_fbc"]) {
    for (const d of domains) {
      document.cookie = `${name}=; max-age=0; path=/${d ? `; domain=${d}` : ""}`;
    }
  }
}

function onRevoke(): void {
  pendingPageView = null;
  if (window.fbq) window.fbq("consent", "revoke");
  deleteMetaCookies();
}

/** Branche l'écoute du consentement (idempotent). */
export function ensureMetaInit(): void {
  if (listening || !META_ENABLED || !browser()) return;
  listening = true;
  maybeLoadPixel();
  onConsentChange((state) => (state === "granted" ? onGrant() : onRevoke()));
}

function pageOnceCheck(key: string): boolean {
  if (pageOnce.has(key)) return false;
  pageOnce.add(key);
  return true;
}

function sessionOnce(key: string): boolean {
  if (onceMemory.has(key)) return false;
  onceMemory.add(key);
  try {
    const k = `rdp_meta_once:${key}`;
    if (sessionStorage.getItem(k)) return false;
    sessionStorage.setItem(k, "1");
  } catch {
    /* stockage indisponible : la mémoire du module suffit pour cette page */
  }
  return true;
}

export interface MetaTrackOptions {
  /**
   * Clé de dédoublonnage : l'événement ne part qu'une fois par session pour
   * cette clé (StrictMode, re-rendus, retour arrière). Consommée même si
   * l'événement est abandonné faute de consentement : il n'est jamais rejoué.
   */
  once?: string;
  /** "session" (défaut) ou "page" : une fois par affichage de page. */
  onceScope?: "session" | "page";
  eventId?: string;
}

/**
 * Envoie un événement Meta. Ne fait rien (et renvoie null) si le Pixel est
 * désactivé, si le consentement n'est pas donné, ou si l'URL n'est pas sûre.
 */
export function track(event: MetaEventName, params?: Record<string, unknown>, opts: MetaTrackOptions = {}): string | null {
  if (!META_ENABLED || !browser()) return null;
  ensureMetaInit();
  if (opts.once && !(opts.onceScope === "page" ? pageOnceCheck(opts.once) : sessionOnce(opts.once))) return null;
  if (!hasMarketingConsent()) return null;
  maybeLoadPixel();
  const eventId = opts.eventId ?? newEventId();
  return send(event, sanitizeParams(params), eventId) ? eventId : null;
}

/**
 * PageView du chemin courant, un seul par changement de route. Avant
 * consentement, il est mis en attente (et remplace le précédent) : c'est le
 * seul événement qui peut partir au moment de l'acceptation.
 */
export function trackPageView(path: string): void {
  if (!META_ENABLED || !browser()) return;
  ensureMetaInit();
  if (path === lastPageViewPath) return;
  lastPageViewPath = path;
  pageOnce.clear();
  const eventId = newEventId();
  if (hasMarketingConsent()) {
    pendingPageView = null;
    maybeLoadPixel();
    send("PageView", {}, eventId);
  } else {
    pendingPageView = isUrlSafeForMeta(window.location.href) ? { path, eventId } : null;
  }
}

/* —————————————————— événements du parcours —————————————————— */

/** Landing : une fois par page, content_name seul (ex. lp_b_flash). */
export const metaViewContent = (contentName: string) =>
  track("ViewContent", { content_name: contentName }, { once: `vc:${contentName}`, onceScope: "page" });

/** Première réponse du diagnostic flash. */
export const metaDiagnosticFlashStart = () =>
  track("DiagnosticFlashStart", { step: "flash" }, { once: "diag_flash_start" });

/** Fourchette affichée — sans aucun montant. */
export const metaDiagnosticFlashComplete = () => track("DiagnosticFlashComplete", {}, { once: "diag_flash_complete" });

/** Résultat du simulateur foyer affiché, une fois par simulation. */
export const metaSimulateurFoyerComplete = (simulationId: string) =>
  track("SimulateurFoyerComplete", {}, { once: `sim_foyer_complete:${simulationId}` });

/** À appeler UNIQUEMENT après une réponse serveur réussie du formulaire. */
export const metaLead = (contentName: string, eventId: string) =>
  track("Lead", { content_name: contentName }, { once: `lead:${eventId}`, eventId });

/** Clic sur tel:, mailto:, WhatsApp ou « Nous contacter » (un par clic). */
export const metaContact = (from: string) => track("Contact", { from });
