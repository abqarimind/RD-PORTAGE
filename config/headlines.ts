/**
 * Continuité pub → page : le titre d'accueil reprend la promesse de la pub
 * d'origine, lue dans `utm_content`. UNIQUEMENT des titres validés (14/10).
 *
 * Le choix se fait dans le middleware (middleware.ts), qui réécrit « / » vers
 * la variante statique /v/<clé> : la page reste servie depuis le CDN, sans
 * rendu serveur à chaque visite, et le bon titre est là dès le premier
 * affichage (pas de titre par défaut qui change après le chargement).
 *
 * Le sous-titre et les mentions de chaque variante sont À VALIDER PAR RIDHA.
 */

export interface Headline {
  key: string;
  /** Titre validé, tel quel. */
  title: string;
  /** Mots du titre mis en surligné jaune (doivent figurer dans le titre). */
  highlight: string;
  /** Préfixes de `utm_content` (comparaison insensible à la casse). */
  ads: string[];
  /** Pastille « Ridha, fondateur » au-dessus du titre (angles fondateur). */
  withFounder?: boolean;
}

/** Sous-titre commun (à valider par Ridha). */
export const HEADLINE_SUBTITLE = "3 questions, ta fourchette de net tout de suite. Sans e-mail.";

export const DEFAULT_HEADLINE_KEY = "vrai-taux";

export const HEADLINES: Headline[] = [
  { key: "vrai-taux", title: "Calcule ton vrai taux", highlight: "vrai taux", ads: ["a_offre"] },
  { key: "foyer", title: "Ton simulateur oublie ton foyer", highlight: "oublie ton foyer", ads: ["b_foyer"] },
  { key: "meme-tjm", title: "Même TJM, pas le même impôt", highlight: "pas le même impôt", ads: ["c06_memetjm"] },
  {
    key: "avant-signer",
    title: "Découvre ton vrai net avant de signer",
    highlight: "vrai net",
    ads: ["c_fondateur"],
    withFounder: true,
  },
  {
    key: "ancien-porte",
    title: "Créé par un ancien consultant porté",
    highlight: "ancien consultant porté",
    ads: ["c09_ancienporte"],
    withFounder: true,
  },
  { key: "fiche-de-paie", title: "Ton vrai net, avant la fiche de paie", highlight: "vrai net", ads: ["c01_fichedepaie"] },
  { key: "calcul", title: "Pas de promesse. Un calcul.", highlight: "Un calcul.", ads: ["c03_plusdefake"] },
  { key: "trois-questions", title: "Ton net en 3 questions", highlight: "3 questions", ads: ["c16_sansemail"] },
];

export const findHeadline = (key: string | null | undefined): Headline | undefined => HEADLINES.find((h) => h.key === key);

export const defaultHeadline = (): Headline => findHeadline(DEFAULT_HEADLINE_KEY)!;

/** Variante correspondant à une valeur de `utm_content` (null si aucune). */
export function headlineForAd(utmContent: string | null | undefined): Headline | null {
  if (!utmContent) return null;
  const v = utmContent.trim().toLowerCase();
  return HEADLINES.find((h) => h.ads.some((prefix) => v.startsWith(prefix))) ?? null;
}

/** Anciennes landings /lp/a|b|c → variante la plus proche (validée). */
export const LP_ANGLE_TO_HEADLINE: Record<string, string> = { a: "vrai-taux", b: "foyer", c: "avant-signer" };

/** content_name Meta et angle du lead : identifiant technique, sans donnée. */
export const angleOf = (h: Headline): string => `lp_${h.key}`;
