/**
 * Notification interne « Nouveau lead simulateur » — une par lead, sans
 * exception (14/10). Elle remplace l'ancienne copie E2 et sert aussi de filet
 * de sécurité : si l'enregistrement dans le CRM échoue ou n'est que partiel,
 * elle porte un bandeau d'alerte et les données brutes du lead.
 *
 * Ordre pensé pour la personne qui rappelle : le numéro d'abord (lien tel:),
 * puis la source complète, le résumé, et le lien sécurisé vers le dossier.
 * La copie de l'email reçu par le prospect vient en dernier.
 */
import type { Lead } from "@/lib/crm/schema";
import { formatPhone } from "@/lib/phone";
import type { SimulationResultPayload } from "@/types/simulation-result";
import { DELAI_RAPPEL } from "@/config/contact";
import { button, esc, h2, layout, row, table, MUTED } from "./layout";
import { corps } from "./recap";

export interface NouveauLeadArgs {
  lead: Lead;
  /** Récapitulatif recalculé côté serveur ; null s'il n'a pas pu l'être. */
  payload: SimulationResultPayload | null;
  dossierUrl?: string;
  /** Écriture CRM échouée ou partielle, lien non signé… : chaque alerte s'affiche. */
  alertes?: string[];
}

/** Libellé court de la source, pour l'objet : l'annonce d'abord, à défaut la campagne. */
export function sourceLabel(lead: Lead): string {
  const t = lead.attribution.first_touch;
  if (t.utm_content) return t.utm_content;
  if (t.utm_campaign) return t.utm_campaign;
  if (t.utm_source) return t.utm_source;
  return lead.attribution.lead_source === "direct" ? "accès direct" : lead.attribution.lead_source;
}

const dateParis = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full", timeStyle: "short" }).format(new Date(iso));

const ouiNon = (v: boolean) => (v ? "oui" : "non");

function lignesSource(lead: Lead): [string, string][] {
  const t = lead.attribution.first_touch;
  return [
    ["Annonce (utm_content)", t.utm_content ?? "—"],
    ["Campagne (utm_campaign)", t.utm_campaign ?? "—"],
    ["Source (utm_source)", t.utm_source ?? "—"],
    ["Support (utm_medium)", t.utm_medium ?? "—"],
    ["Clic publicitaire Meta (fbclid)", ouiNon(Boolean(t.fbclid || lead.attribution.last_touch.fbclid))],
    ["Page d'arrivée", t.landing_path ?? "—"],
    ["Angle", lead.journey?.angle ?? "—"],
    ["Site précédent", t.referrer ?? "—"],
    ["Origine (classement)", lead.attribution.lead_source],
    ["Appareil", lead.attribution.device],
    ["Envoyé depuis l'étape", lead.journey?.last_step ?? "—"],
  ];
}

export function emailNouveauLead({ lead, payload, dossierUrl, alertes = [] }: NouveauLeadArgs) {
  const prenom = lead.identity.first_name;
  const tel = lead.identity.phone;
  const telAffiche = tel ? formatPhone(tel) : "non renseigné";
  const source = sourceLabel(lead);
  const quand = dateParis(lead.created_at);
  const resume = lead.journey?.summary;

  const bandeau =
    alertes.length > 0
      ? `<p style="margin:0 0 16px 0;padding:12px 14px;background-color:#FDF6F5;border-left:4px solid #B3261E;font-size:13px;line-height:1.6;color:#B3261E;"><strong>Alerte technique</strong><br>${alertes
          .map((a) => esc(a))
          .join("<br>")}<br>Les données brutes du lead figurent en fin d'email : il reste récupérable à la main.</p>`
      : "";

  const body = `${bandeau}
<p style="margin:0 0 4px 0;font-size:13px;color:${MUTED};">${esc(quand)} · à rappeler ${esc(DELAI_RAPPEL)}</p>
<p style="margin:0 0 12px 0;font-size:22px;font-weight:bold;line-height:1.3;">${esc(prenom)}</p>
${
  tel
    ? `<p style="margin:0 0 8px 0;"><a href="tel:${esc(tel)}" style="display:inline-block;padding:12px 20px;background-color:#0B0D12;color:#FFFFFF;border-radius:999px;font-size:18px;font-weight:bold;text-decoration:none;">Appeler ${esc(telAffiche)}</a></p>`
    : `<p style="margin:0 0 8px 0;font-size:15px;">Téléphone : non renseigné</p>`
}
<p style="margin:0 0 4px 0;font-size:14px;">Email : <a href="mailto:${esc(lead.identity.email)}" style="color:#0B0D12;">${esc(lead.identity.email)}</a></p>
<p style="margin:0 0 16px 0;font-size:13px;color:${MUTED};">Conseils par email acceptés : ${ouiNon(lead.consent.marketing_optin)}</p>

${h2("Source")}
${table(lignesSource(lead).map(([l, v]) => row(l, esc(v))).join(""))}

${h2("Résumé de la simulation")}
<p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;">${resume ? esc(resume) : "Récapitulatif non calculable : voir les données brutes."}</p>

${dossierUrl ? button(dossierUrl, "Ouvrir le dossier du lead") : ""}

${
  payload
    ? `<div style="margin-top:28px;padding-top:16px;border-top:1px solid #ECEEF3;">
<p style="margin:0 0 12px 0;font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};">Copie de l'email reçu par le prospect</p>
${corps(payload, true)}
</div>`
    : ""
}
${alertes.length > 0 ? donneesBrutes(lead) : ""}`;

  const text = [
    alertes.length > 0 ? `ALERTE TECHNIQUE\n${alertes.map((a) => `- ${a}`).join("\n")}\nDonnées brutes en fin d'email.\n` : "",
    `NOUVEAU LEAD SIMULATEUR — ${quand} — à rappeler ${DELAI_RAPPEL}`,
    ``,
    `Prénom : ${prenom}`,
    `Téléphone : ${telAffiche}${tel ? ` (tel:${tel})` : ""}`,
    `Email : ${lead.identity.email}`,
    `Conseils par email acceptés : ${ouiNon(lead.consent.marketing_optin)}`,
    ``,
    `SOURCE`,
    ...lignesSource(lead).map(([l, v]) => `- ${l} : ${v}`),
    ``,
    `RÉSUMÉ`,
    resume ?? "Récapitulatif non calculable.",
    ``,
    dossierUrl ? `Dossier : ${dossierUrl}` : "",
    `Référence : ${lead.lead_id}`,
    alertes.length > 0 ? `\nDONNÉES BRUTES\n${JSON.stringify(lead, null, 1)}` : "",
  ]
    .filter((l) => l !== "")
    .join("\n");

  return {
    subject: `${alertes.length > 0 ? "[ALERTE] " : ""}Nouveau lead simulateur — ${prenom} — ${source}`,
    html: layout({
      title: "Nouveau lead simulateur",
      preheader: `${prenom} · ${telAffiche} · ${source}`,
      body,
      footer: `Notification interne automatique, envoyée à chaque lead. Référence : ${esc(lead.lead_id)}.`,
    }),
    text,
  };
}

function donneesBrutes(lead: Lead): string {
  return `<div style="margin-top:20px;padding:12px;background-color:#FAFBFD;border:1px solid #ECEEF3;border-radius:8px;">
  <p style="margin:0 0 6px 0;font-size:12px;font-weight:bold;color:${MUTED};">DONNÉES BRUTES — à ressaisir dans le CRM</p>
  <pre style="margin:0;font-family:monospace;font-size:11px;line-height:1.4;white-space:pre-wrap;word-break:break-all;color:#0B0D12;">${esc(
    JSON.stringify(lead, null, 1),
  )}</pre>
</div>`;
}
