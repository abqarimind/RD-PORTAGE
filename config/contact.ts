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

/* ——— Identité de l'entreprise — source unique (retours #15 et #17 du 25/09) ——— */

export const RAISON_SOCIALE = "RD Portage";
/** Adresse du siège (#15). L'ancienne, « 1 rue George Stephenson », ne doit plus apparaître. */
export const ADRESSE = "1 place Charles de Gaulle, 78180 Montigny-le-Bretonneux";
export const RCS = "RCS Versailles 912 888 013";
/** Immatriculation (#17) : 01/04/2022 — et non 2021. */
export const DATE_IMMATRICULATION = "01/04/2022";
export const ANNEE_CREATION = 2022;
/** Frais de gestion affichés (#22 : 4 %, jamais 5 %). */
export const FRAIS_GESTION_LABEL = "4 %";

/** Ligne légale commune aux pieds de page du site et des emails. */
export const LIGNE_LEGALE = `${RAISON_SOCIALE} — ${ADRESSE} · ${RCS}`;
/** Téléphone au format international, pour les pieds de page. */
export const PHONE_INTL_LABEL = "+33 1 71 49 71 57";
