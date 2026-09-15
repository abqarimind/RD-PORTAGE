/**
 * Vérifications d'environnement au démarrage.
 *
 * Importé par les routes d'API qui en dépendent : en production, une
 * configuration dangereuse doit faire échouer la route bruyamment plutôt
 * que la laisser tourner en mode dégradé. C'est la leçon de BUG-06 — un
 * défaut silencieux a été découvert par un utilisateur du client, pas par
 * nous.
 *
 * La vérification est ignorée pendant `next build` : les variables de
 * production ne sont pas nécessairement présentes au moment de la
 * compilation, et faire échouer le build n'apprendrait rien d'utile.
 */

const isBuildPhase = () => process.env.NEXT_PHASE === "phase-production-build";
const isProduction = () => process.env.NODE_ENV === "production";

/**
 * DOSSIER_SECRET signe les liens de dossier. Sans lui, un secret de
 * développement connu prendrait le relais et n'importe qui pourrait forger
 * un lien affichant des montants arbitraires sous la marque RD Portage.
 * En production, c'est bloquant.
 */
export function assertDossierSecret(): void {
  if (isBuildPhase() || !isProduction()) return;
  const secret = process.env.DOSSIER_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "DOSSIER_SECRET manquant ou trop court (32 caractères minimum attendus) en production. " +
        "Les liens de dossier seraient forgeables. Générer : openssl rand -hex 32",
    );
  }
}

/**
 * Envoyer depuis l'adresse qui reçoit les copies internes produit des
 * comportements de filtrage erratiques chez la plupart des clients mail
 * (auto-expédition classée en promotion, en spam, ou repliée dans le fil).
 * Non bloquant — les emails partent quand même — mais journalisé une fois.
 */
let mailWarned = false;
export function warnIfMailAddressesCollide(): void {
  if (mailWarned) return;
  const from = process.env.MAIL_FROM ?? "";
  const to = process.env.MAIL_INTERNAL_TO ?? "";
  if (!from || !to) return;
  const address = (v: string) => (v.match(/<([^>]+)>/)?.[1] ?? v).trim().toLowerCase();
  if (address(from) === address(to)) {
    mailWarned = true;
    console.error(
      "[email] MAIL_FROM et MAIL_INTERNAL_TO sont la MÊME adresse " +
        `(${address(from)}). Les copies internes risquent d'être filtrées ou repliées par le client mail. ` +
        "Utiliser un expéditeur distinct sur le même domaine, par exemple simulateur@rdportage.com.",
    );
  }
}

/** À appeler en tête des routes qui envoient des emails ou signent un lien. */
export function assertEmailEnv(): void {
  assertDossierSecret();
  warnIfMailAddressesCollide();
}
