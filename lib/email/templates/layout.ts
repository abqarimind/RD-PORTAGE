/**
 * Coquille HTML commune aux emails transactionnels.
 *
 * Contraintes imposées (§5.3), à respecter quel que soit le design final :
 * tableaux et non flex/grid, CSS strictement inline, largeur 600 px, images
 * en URL absolue avec alt, et une version texte brut fournie pour chaque
 * envoi. Le style reste volontairement sobre : l'artefact visuel est conçu
 * en parallèle et remplacera ce gabarit — seul le contrat de données
 * (types/simulation-result.ts) est destiné à durer.
 */

import { groupFr } from "@/lib/format";

export const INK = "#0B0D12";
export const BRASS = "#B08D57";
export const MUTED = "#7A8093";
export const BORDER = "#ECEEF3";

/** Échappement HTML — toute donnée utilisateur passe par ici. */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const eur = (n: number) => `${groupFr(n)}\u00A0€`;
export const eurSigned = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${groupFr(Math.abs(n))}\u00A0€`;
export const pct = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")} %`;

export interface LayoutArgs {
  title: string;
  preheader: string;
  body: string;
  /** Pied de page légal — diffère entre email au lead et copie interne. */
  footer: string;
}

export function layout({ title, preheader, body, footer }: LayoutArgs): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F6F9;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F6F9;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background-color:#FFFFFF;border-radius:12px;border:1px solid ${BORDER};">
        <tr>
          <td style="padding:24px 28px 8px 28px;font-family:Helvetica,Arial,sans-serif;">
            <p style="margin:0;font-size:18px;font-weight:bold;color:${INK};letter-spacing:-0.3px;">RD Portage</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 28px 28px;font-family:Helvetica,Arial,sans-serif;color:${INK};">
${body}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 28px 24px 28px;border-top:1px solid ${BORDER};font-family:Helvetica,Arial,sans-serif;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};">${footer}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Bouton — en tableau, seul format fiable sur Outlook. */
export function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
  <tr><td align="center" bgcolor="${INK}" style="border-radius:999px;">
    <a href="${esc(href)}" style="display:inline-block;padding:14px 28px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:999px;">${esc(label)}</a>
  </td></tr>
</table>`;
}

/** Ligne libellé / valeur. */
export function row(label: string, value: string, strong = false): string {
  return `<tr>
  <td style="padding:8px 0;border-bottom:1px solid ${BORDER};font-size:14px;color:${MUTED};">${esc(label)}</td>
  <td align="right" style="padding:8px 0;border-bottom:1px solid ${BORDER};font-size:14px;color:${INK};${strong ? "font-weight:bold;" : ""}">${esc(value)}</td>
</tr>`;
}

export function table(rows: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 16px 0;">${rows}</table>`;
}

/**
 * Domaine affiché dans les pieds d'email. Déduit des URLs déjà construites à
 * partir de `baseUrl`, pour qu'un changement de domaine (par exemple le
 * passage à simulateur.rdportage.com) ne tienne qu'à une seule variable
 * d'environnement et ne laisse pas d'adresse périmée dans les mentions.
 */
export function siteDomain(mentionsUrl: string): string {
  try {
    return new URL(mentionsUrl).host;
  } catch {
    return "rdportage.com";
  }
}

export function h2(text: string): string {
  return `<p style="margin:24px 0 4px 0;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:${BRASS};">${esc(text)}</p>`;
}
