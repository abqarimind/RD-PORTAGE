/**
 * Doublures des scripts Meta et Plausible, et capture de leurs requêtes.
 *
 * - fbevents.js est remplacé par un script qui reproduit ce qui compte pour
 *   nous : file d'attente `fbq`, blocage tant que le consentement est retiré,
 *   puis une requête `facebook.com/tr` par événement, avec `ev`, `dl` (URL de
 *   la page), `eid` et un `cd[clé]` par paramètre, comme le vrai Pixel.
 * - Le script Plausible est remplacé par un script qui lit la file
 *   `plausible.q`, applique `transformRequest` (celui du site, app/layout.tsx)
 *   et envoie un POST `plausible.io/api/event` par pageview et par événement.
 * Toutes ces requêtes sont interceptées et enregistrées ; aucune ne sort.
 */
import type { Page, Request } from "@playwright/test";

const FBEVENTS_STUB = `(function(){
  var fbq = window.fbq; if (!fbq) return;
  var granted = false, held = [], pixel = "";
  function send(name, params, opts){
    var q = new URLSearchParams({ id: pixel, ev: name, dl: location.href, eid: (opts && opts.eventID) || "" });
    Object.keys(params || {}).forEach(function(k){ q.set("cd[" + k + "]", params[k]); });
    new Image().src = "https://www.facebook.com/tr/?" + q.toString();
  }
  function handle(a){
    var cmd = a[0];
    if (cmd === "consent") { granted = a[1] === "grant"; if (granted) held.splice(0).forEach(handle); return; }
    if (cmd === "init") { pixel = a[1]; return; }
    if (cmd === "track" || cmd === "trackCustom") { if (!granted) { held.push(a); return; } send(a[1], a[2], a[3]); }
  }
  var queued = fbq.queue || []; fbq.queue = [];
  fbq.callMethod = function(){ handle(Array.prototype.slice.call(arguments)); };
  queued.forEach(handle);
})();`;

const PLAUSIBLE_STUB = `(function(){
  var p = window.plausible || {}, o = p.o || {}, q = p.q || [];
  function send(name, opts){
    var payload = { n: name, u: location.href, d: "simulateur.rdportage.com", r: document.referrer || null };
    if (opts && opts.props) payload.p = opts.props;
    if (typeof o.transformRequest === "function") { payload = o.transformRequest(payload); if (!payload) return; }
    fetch("https://plausible.io/api/event", { method: "POST", body: JSON.stringify(payload), keepalive: true });
  }
  var real = function(name, opts){ send(name, opts); };
  real.init = function(){}; real.o = o;
  window.plausible = real;
  q.forEach(function(a){ send(a[0], a[1]); });
  send("pageview");
  var push = history.pushState;
  history.pushState = function(){ push.apply(this, arguments); send("pageview"); };
})();`;

export interface MetaHit {
  ev: string;
  dl: string;
  eid: string;
  params: Record<string, string>;
  raw: string;
}

export interface PlausibleHit {
  n: string;
  u: string;
  p?: Record<string, string>;
  raw: string;
}

export interface Captured {
  meta: MetaHit[];
  /** Toute requête vers un domaine Meta (script compris). */
  metaRequests: string[];
  plausible: PlausibleHit[];
  leadPayloads: Record<string, unknown>[];
}

export async function installStubs(page: Page): Promise<Captured> {
  const captured: Captured = { meta: [], metaRequests: [], plausible: [], leadPayloads: [] };

  // Playwright essaie les routes de la DERNIÈRE enregistrée à la première :
  // le filet général d'abord, les doublures précises ensuite.
  // Tout autre appel à un domaine Meta est enregistré puis bloqué.
  await page.route(/facebook\.(com|net)/, (route) => {
    captured.metaRequests.push(route.request().url());
    return route.abort();
  });

  await page.route(/connect\.facebook\.net\/.*fbevents\.js/, (route) => {
    captured.metaRequests.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "application/javascript", body: FBEVENTS_STUB });
  });
  await page.route(/facebook\.com\/tr/, (route) => {
    const url = new URL(route.request().url());
    captured.metaRequests.push(url.toString());
    const params: Record<string, string> = {};
    url.searchParams.forEach((v, k) => {
      const m = /^cd\[(.+)\]$/.exec(k);
      if (m) params[m[1]] = v;
    });
    captured.meta.push({
      ev: url.searchParams.get("ev") ?? "",
      dl: url.searchParams.get("dl") ?? "",
      eid: url.searchParams.get("eid") ?? "",
      params,
      raw: url.toString(),
    });
    return route.fulfill({ status: 200, contentType: "image/gif", body: "" });
  });

  await page.route(/plausible\.io\/js\//, (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: PLAUSIBLE_STUB }),
  );
  await page.route(/plausible\.io\/api\/event/, (route) => {
    const raw = route.request().postData() ?? "{}";
    const body = JSON.parse(raw) as { n: string; u: string; p?: Record<string, string> };
    captured.plausible.push({ n: body.n, u: body.u, p: body.p, raw });
    return route.fulfill({ status: 202, body: "ok" });
  });

  // Polices Google : inutiles au test, on évite la dépendance réseau.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());

  page.on("request", (req: Request) => {
    if (req.method() === "POST" && new URL(req.url()).pathname === "/api/lead") {
      captured.leadPayloads.push(JSON.parse(req.postData() ?? "{}"));
    }
  });

  return captured;
}
