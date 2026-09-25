/**
 * Coordonnées de contact — SOURCE UNIQUE pour tout le site et les emails.
 *
 * Décision client du 24/09 : le contact passe par l'équipe, plus par une
 * personne nommée. La ligne fixe de l'équipe remplace le portable de Ridha
 * partout, et l'engagement de rappel est « sous 24 h ».
 */
export const PHONE_E164 = "+33171497157";
export const PHONE_LABEL = "01 71 49 71 57";
export const TEL_URL = `tel:${PHONE_E164}`;

/** Lien de prise de RDV (Calendly, Cal.com…) s'il existe, sinon appel direct. */
export const RDV_URL = process.env.NEXT_PUBLIC_RDV_URL || TEL_URL;

/** Libellé unique du bouton de contact (décision D1). */
export const CTA_CONSEILLER = "Parler à mon conseiller";

/** Engagement de rappel affiché au prospect (décision D4). */
export const DELAI_RAPPEL = "sous 24 h";

/**
 * Adresse de l'entreprise : expéditeur des emails envoyés au prospect ET
 * destinataire de ses réponses (décision D5). Affichée sur le site pour que
 * le prospect l'ajoute à ses contacts (retour « email arrivé en spam »).
 * L'expéditeur technique réel reste piloté par MAIL_FROM côté serveur.
 */
export const EMAIL_ENTREPRISE = "marketing@rdportage.com";
