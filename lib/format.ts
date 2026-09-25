/**
 * Formatage des montants en français.
 *
 * `toLocaleString("fr-FR")` sépare les milliers par une espace fine
 * insécable (U+202F), quasi invisible dans la police du site : « 63681 € »
 * se lisait comme un bloc. On la remplace par l'espace insécable standard
 * (U+00A0), bien visible et qui ne se coupe jamais en fin de ligne.
 */
export const NBSP = " ";

export const groupFr = (n: number) => Math.round(n).toLocaleString("fr-FR").replace(/ /g, NBSP);
