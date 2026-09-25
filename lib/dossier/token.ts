/**
 * Lien permanent du dossier — le payload voyage DANS l'URL, signé.
 *
 * Pourquoi ce choix : le dossier doit rester ouvrable depuis un email, donc
 * potentiellement sur un autre appareil que celui de la simulation. Le
 * stockage des leads est aujourd'hui non durable (voir rapport §5.4 :
 * CRM_PROVIDER=mock écrit dans une Map en mémoire, perdue à chaque
 * invocation serverless). Plutôt que d'introduire une base de données sans
 * arbitrage du client, le récapitulatif est encodé, compressé et SIGNÉ dans
 * le lien : aucune infrastructure, aucune donnée de plus à conserver, et un
 * lien qui reste valable même si le stockage change plus tard.
 *
 * La signature HMAC empêche toute altération des montants par un tiers ; elle
 * ne chiffre pas : le contenu reste les données de l'utilisateur lui-même,
 * comme dans l'email qui porte le lien.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { assertDossierSecret } from "@/lib/env";
import type { SimulationResultPayload } from "@/types/simulation-result";

/**
 * Secret de signature. En l'absence de DOSSIER_SECRET, on retombe sur une
 * valeur de développement : les liens restent fonctionnels en local, mais la
 * variable DOIT être définie en production (voir .env.example).
 */
function secret(): string {
  const s = process.env.DOSSIER_SECRET;
  if (s && s.length >= 16) return s;
  // En production, l'absence du secret est bloquante (lib/env.ts) : on ne
  // produit jamais un lien signé avec une valeur connue de tous.
  assertDossierSecret();
  return "rdp-dossier-dev-secret-change-me";
}

const b64url = (buf: Buffer) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

const sign = (data: string) => b64url(createHmac("sha256", secret()).update(data).digest());

/** Signature HMAC réutilisable (lien de désinscription, #13). */
export const signValue = (data: string) => sign(data);
export const toB64url = (text: string) => b64url(Buffer.from(text, "utf8"));
export const fromB64url = (value: string) => unb64url(value).toString("utf8");

/** Encode un payload en couple { d, s } à mettre en query string. */
export function encodeDossier(payload: SimulationResultPayload): { d: string; s: string } {
  const d = b64url(gzipSync(Buffer.from(JSON.stringify(payload), "utf8"), { level: 9 }));
  return { d, s: sign(d) };
}

/** URL complète du dossier, prête à être mise dans un email. */
export function dossierUrl(payload: SimulationResultPayload, baseUrl: string): string {
  const { d, s } = encodeDossier(payload);
  return `${baseUrl}/dossier?d=${d}&s=${s}`;
}

/**
 * Décode et vérifie. Renvoie null si la signature est absente, invalide, ou
 * si le contenu n'est pas un payload exploitable — jamais d'exception, la
 * page dossier doit pouvoir afficher un message propre.
 */
export function decodeDossier(d: string | null | undefined, s: string | null | undefined): SimulationResultPayload | null {
  if (!d || !s) return null;
  try {
    const expected = Buffer.from(sign(d));
    const got = Buffer.from(s);
    if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
    const json = gunzipSync(unb64url(d)).toString("utf8");
    const payload = JSON.parse(json) as SimulationResultPayload;
    if (!payload || typeof payload !== "object" || !payload.version || !payload.resultats) return null;
    return payload;
  } catch {
    return null;
  }
}
