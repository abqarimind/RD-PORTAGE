/**
 * Séquence prospects J3 → J14 (Resend Automations) — lecture des contenus.
 *
 * Les textes vivent dans content/emails/*.txt, en texte simple, pour être
 * relus et modifiés sans toucher au code. Ce module les assemble avec la
 * signature et le pied légal, et remplace les données d'entreprise (%…%)
 * depuis leur source unique — aucune adresse, aucun numéro, aucun taux n'est
 * recopié à la main dans les emails.
 *
 * Deux syntaxes cohabitent volontairement :
 *   %TOKEN%       remplacé ICI, au chargement (données d'entreprise) ;
 *   {{{VARIABLE}}} laissé à Resend, remplacé à l'envoi (prénom, montant,
 *                  lien de désinscription).
 *
 * Module serveur / script uniquement (lecture de fichiers).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CAGNOTTE_PROVIDERS, MICRO_BNC_2026 } from "@/config/fiscal-2026";
import { FRAIS_GESTION_LABEL, LIGNE_LEGALE, PHONE_LABEL } from "@/config/contact";
import { computePortage } from "@/lib/fiscal/portage";
import { groupFr } from "@/lib/format";

export const SEQUENCE_DIR = join(process.cwd(), "content", "emails");

export interface SequenceEmail {
  /** Nom de fichier sans extension, ex. « j10-salarie-esn ». */
  id: string;
  /** Jour d'envoi après la simulation (J3, J6, J10, J14). */
  jour: number;
  objet: string;
  /** Variante de l'email 3 : statut_actuel visé. */
  statut?: string;
  /** Variante de l'email 4 : condition sur economie_mensuelle. */
  condition?: string;
  /** Corps seul (hors signature et pied), pour les contrôles de longueur. */
  corps: string;
  /** Email complet, texte simple. */
  text: string;
  /** Même contenu en HTML minimal : paragraphes, aucun style, aucun lien. */
  html: string;
}

/** Cas type cité en signature — recalculé par le moteur, jamais recopié (#28). */
function casType(): string {
  const r = computePortage({
    tjm: 420,
    days: 20,
    ndf: 500,
    cagnotteMay: CAGNOTTE_PROVIDERS.may.usableMonthly,
    cagnotteCost: CAGNOTTE_PROVIDERS.may.defaultMonthly,
    mealVouchers: true,
  });
  return `Cas type : TJM 420 €, 20 jours par mois, ${Math.round(r.restitutionRate * 100)} % du chiffre d'affaires restitué avant impôt, cagnotte May et titres-restaurant compris.`;
}

export function tokens(): Record<string, string> {
  return {
    "%TELEPHONE%": PHONE_LABEL,
    "%FRAIS%": FRAIS_GESTION_LABEL,
    "%PLAFOND_MICRO%": groupFr(MICRO_BNC_2026.plafondCa).replace(/ /g, " "),
    "%LIGNE_LEGALE%": LIGNE_LEGALE,
    "%CAS_TYPE%": casType(),
    // URL LinkedIn de Ridha : en attente (question ouverte). Ligne retirée si vide.
    "%LINKEDIN_RIDHA%": process.env.RIDHA_LINKEDIN_URL ?? "",
  };
}

function remplacer(texte: string): string {
  let out = texte;
  for (const [cle, valeur] of Object.entries(tokens())) out = out.split(cle).join(valeur);
  // Une ligne devenue vide (LinkedIn absent) disparaît au lieu de laisser un trou.
  return out
    .split("\n")
    .filter((l, i, arr) => !(l.trim() === "" && arr[i - 1]?.trim() === ""))
    .join("\n")
    .trim();
}

const echapper = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function versHtml(texte: string): string {
  return texte
    .split(/\n{2,}/)
    .map((bloc) => `<p>${echapper(bloc).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

export function parseEmail(id: string, brut: string, signature: string, pied: string): SequenceEmail {
  const [entete, ...reste] = brut.split(/^---$/m);
  if (reste.length === 0) throw new Error(`${id} : séparateur « --- » manquant après l'en-tête`);
  const champ = (nom: string) => entete.match(new RegExp(`^${nom}\\s*:\\s*(.+)$`, "m"))?.[1]?.trim();
  const objet = champ("Objet");
  if (!objet) throw new Error(`${id} : ligne « Objet : » manquante`);
  const corps = remplacer(reste.join("---").trim());
  const text = remplacer(`${corps}\n\n${signature.trim()}\n\n${pied.trim()}`);
  return {
    id,
    jour: Number(id.match(/^j(\d+)/)?.[1] ?? NaN),
    objet: remplacer(objet),
    statut: champ("Statut"),
    condition: champ("Condition"),
    corps,
    text,
    html: versHtml(text),
  };
}

/** Tous les emails de la séquence, dans l'ordre des jours. */
export function loadSequence(dir = SEQUENCE_DIR): SequenceEmail[] {
  const lire = (f: string) => readFileSync(join(dir, f), "utf8");
  const signature = lire("_signature.txt");
  const pied = lire("_pied.txt");
  return readdirSync(dir)
    .filter((f) => /^j\d+.*\.txt$/.test(f))
    .sort()
    .map((f) => parseEmail(f.replace(/\.txt$/, ""), lire(f), signature, pied));
}

/** Nombre de mots d'un texte (hors variables Resend). */
export const compterMots = (t: string) =>
  t
    .replace(/\{\{\{[^}]+\}\}\}/g, "X")
    .split(/\s+/)
    .filter((m) => /[\p{L}\p{N}]/u.test(m)).length;

/** Marqueurs [[…]] : un contenu encore à fournir bloque tout chargement. */
export const aCompleter = (e: SequenceEmail) => e.text.match(/\[\[[^\]]+\]\]/g) ?? [];
