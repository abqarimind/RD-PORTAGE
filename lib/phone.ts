/**
 * Téléphone du lead — obligatoire depuis le 14/10 (décision de Ridha).
 *
 * Normalisation en E.164 (« +33612345678 ») : c'est le format que le futur
 * CRM, un lien `tel:` et n'importe quel outil d'appel comprennent sans
 * ambiguïté. Fonctions pures, partagées par le formulaire (message d'erreur
 * immédiat) et par /api/lead (la validation serveur fait seule autorité).
 *
 * Formats acceptés :
 *  - français national : 06 12 34 56 78, 06.12.34.56.78, 0612345678 ;
 *  - français international : +33 6 12 34 56 78, +33 (0)6 12…, 0033 6 12… ;
 *  - tout autre pays au format international : +44 7911 123456, 0044…
 * Les espaces, points, tirets et parenthèses sont ignorés.
 */

/** E.164 : « + », un indicatif qui ne commence pas par 0, 9 à 15 chiffres au total (en dessous, c'est presque toujours une faute de frappe). */
const E164 = /^\+[1-9]\d{8,14}$/;

export function normalizePhone(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  let s = input.trim();
  if (!s) return null;
  // « +33 (0)6 … » : le zéro entre parenthèses ne se compose pas depuis l'étranger.
  s = s.replace(/\(\s*0\s*\)/g, "");
  s = s.replace(/[\s.\-()/]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (!/^\+?\d+$/.test(s)) return null;

  if (!s.startsWith("+")) {
    // Numéro national : seul le format français est reconnu (0 + 9 chiffres).
    return /^0[1-9]\d{8}$/.test(s) ? `+33${s.slice(1)}` : null;
  }
  if (s.startsWith("+33")) {
    let national = s.slice(3);
    if (national.startsWith("0")) national = national.slice(1); // « +33 06… », erreur fréquente
    return /^[1-9]\d{8}$/.test(national) ? `+33${national}` : null;
  }
  return E164.test(s) ? s : null;
}

export const isValidPhone = (input: string | null | undefined): boolean => normalizePhone(input) !== null;

/** Affichage lisible : « +33 6 12 34 56 78 » pour la France, E.164 brut sinon. */
export function formatPhone(e164: string): string {
  const m = /^\+33(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(e164);
  return m ? `+33 ${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}` : e164;
}

/** Message unique, côté formulaire comme côté serveur. */
export const PHONE_ERROR = "Numéro invalide. Exemple : 06 12 34 56 78 ou +33 6 12 34 56 78.";
