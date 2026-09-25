/**
 * Lien de désinscription signé (#13).
 *
 * Le lien porte l'email encodé et une signature HMAC : personne ne peut
 * désinscrire une autre adresse en fabriquant l'URL. Un clic suffit, sans
 * compte ni mot de passe (exigence RGPD / CNIL : se désinscrire aussi
 * simplement qu'on s'est inscrit).
 */
import { fromB64url, signValue, toB64url } from "@/lib/dossier/token";

export function unsubscribeUrl(email: string, baseUrl: string): string {
  const e = toB64url(email.trim().toLowerCase());
  return `${baseUrl}/api/desinscription?e=${e}&s=${signValue(`unsub:${e}`)}`;
}

/** Renvoie l'email si la signature est valide, sinon null. */
export function verifyUnsubscribe(e: string | null, s: string | null): string | null {
  if (!e || !s) return null;
  try {
    if (signValue(`unsub:${e}`) !== s) return null;
    const email = fromB64url(e);
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null;
  } catch {
    return null;
  }
}
