/**
 * E3 — confirmation d'inscription envoyée au lead, avec les prochaines étapes.
 * E4 — notification de nouveau lead au client interne, avec les coordonnées
 *      et les données clés de la simulation.
 *
 * Comme E1/E2, ce sont deux envois séparés et non un Bcc : filtrables, et E4
 * part même si E3 échoue.
 */
import type { SimulationResultPayload } from "@/types/simulation-result";
import { button, esc, eur, eurSigned, h2, layout, pct, row, table, MUTED } from "./layout";

const PHONE_LABEL = "06 32 98 87 23";

export function emailInscriptionLead(p: SimulationResultPayload, unsubscribeUrl?: string) {
  const body = `
<p style="margin:0 0 4px 0;font-size:15px;">Bonjour ${esc(p.identite.prenom)},</p>
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">Votre inscription est bien enregistrée. Voici ce qui vous attend.</p>

${h2("Prochaines étapes")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 16px 0;">
  <tr><td style="padding:10px 0;border-bottom:1px solid #ECEEF3;font-size:14px;line-height:1.6;"><strong>1. Votre dossier</strong><br><span style="color:${MUTED};">Il reprend votre simulation complète et reste consultable à tout moment.</span></td></tr>
  <tr><td style="padding:10px 0;border-bottom:1px solid #ECEEF3;font-size:14px;line-height:1.6;"><strong>2. Le Diagnostic 30 minutes</strong><br><span style="color:${MUTED};">Ridha, fondateur et ancien porté, valide votre chiffre avec vous. Proposition ferme à l'issue de l'échange.</span></td></tr>
  <tr><td style="padding:10px 0;font-size:14px;line-height:1.6;"><strong>3. Votre contrat</strong><br><span style="color:${MUTED};">Si le portage vous convient, la signature est possible sous 48 h.</span></td></tr>
</table>

${p.meta.dossierUrl ? button(p.meta.dossierUrl, "Ouvrir mon dossier") : ""}

<p style="margin:16px 0 0 0;font-size:14px;line-height:1.6;">Une question d'ici là ? Répondez simplement à cet email, ou appelez Ridha au ${PHONE_LABEL}.</p>

<p style="margin:20px 0 0 0;font-size:13px;color:${MUTED};">Référence de simulation : ${esc(p.meta.simulationId)}</p>`;

  const footer = [
    esc(p.meta.mentions.valeurIndicative),
    `Vous recevez cet email à la suite de votre inscription sur rd-portage.vercel.app.`,
    `<a href="${esc(p.meta.mentions.politiqueConfidentialiteUrl)}" style="color:${MUTED};">Politique de confidentialité</a> · <a href="${esc(
      p.meta.mentions.mentionsLegalesUrl,
    )}" style="color:${MUTED};">Mentions légales</a>${
      unsubscribeUrl ? ` · <a href="${esc(unsubscribeUrl)}" style="color:${MUTED};">Se désinscrire</a>` : ""
    }`,
    `RD Portage — 1 rue George Stephenson, 78180 Montigny-le-Bretonneux · RCS Versailles 912 888 013`,
  ].join("<br>");

  const text = [
    `Bonjour ${p.identite.prenom},`,
    ``,
    `Votre inscription est bien enregistrée. Voici ce qui vous attend.`,
    ``,
    `1. VOTRE DOSSIER — il reprend votre simulation complète et reste consultable à tout moment.`,
    `2. LE DIAGNOSTIC 30 MINUTES — Ridha, fondateur et ancien porté, valide votre chiffre avec vous. Proposition ferme à l'issue de l'échange.`,
    `3. VOTRE CONTRAT — si le portage vous convient, la signature est possible sous 48 h.`,
    ``,
    p.meta.dossierUrl ? `Votre dossier : ${p.meta.dossierUrl}` : ``,
    ``,
    `Une question d'ici là ? Répondez à cet email, ou appelez Ridha au ${PHONE_LABEL}.`,
    ``,
    p.meta.mentions.valeurIndicative,
    `Référence de simulation : ${p.meta.simulationId}`,
    `Politique de confidentialité : ${p.meta.mentions.politiqueConfidentialiteUrl}`,
  ].join("\n");

  return {
    subject: `${p.identite.prenom}, votre inscription RD Portage est confirmée`,
    html: layout({
      title: "Votre inscription est confirmée",
      preheader: "Votre dossier, le Diagnostic 30 minutes, et la suite.",
      body,
      footer,
    }),
    text,
  };
}

/** E4 — notification interne : coordonnées + données clés, pour rappeler vite. */
export function emailInscriptionInterne(p: SimulationResultPayload) {
  const r = p.resultats;
  const body = `
<p style="margin:0 0 16px 0;padding:10px 14px;background-color:#E7F6EE;border-radius:8px;font-size:14px;">
  <strong>Nouveau lead inscrit</strong> — ${esc(p.meta.dateSimulationLabel)}
</p>

${h2("Coordonnées")}
${table(
  row("Prénom", p.identite.prenom, true) +
    row("Email", p.identite.email, true) +
    row("Téléphone", p.identite.telephone ?? "non renseigné", !!p.identite.telephone) +
    row("Profil", p.identite.profilLabel),
)}

${h2("Données clés de la simulation")}
${table(
  row(
    "TJM",
    p.activite.tjmMode === "fourchette" && p.activite.tjmFourchette
      ? `fourchette ${p.activite.tjmFourchette.label} (calcul ${eur(p.activite.tjmFourchette.mediane)})`
      : `${eur(p.activite.tjm)} exact`,
  ) +
    row("Jours facturés", `${p.activite.joursFactures} / mois`) +
    row("CA HT mensuel", eur(r.mensuel.caHt)) +
    row("Foyer", `${p.foyer.situationLabel} · ${p.foyer.nombreDeParts} part(s) · ${p.foyer.enfants} enfant(s)`) +
    row("Avantages", p.avantages.avantagesInclus ? p.avantages.selection.map((a) => a.label).join(", ") : "aucun") +
    row("Perçu net mensuel", eur(r.mensuel.percuNet), true) +
    row("Rémunération globale", eur(r.mensuel.remunerationGlobale), true) +
    row("Taux de restitution", pct(r.tauxRestitution)) +
    row("Taux moyen d'imposition", pct(r.tauxMoyenImposition)) +
    row("TMI", `${(r.tmi * 100).toFixed(0)} %`) +
    row("Écart (optimisé − actuel)", `${eurSigned(r.laisseSurLaTable)} / an`, true),
)}

${h2("Source")}
${table(
  row("Origine", p.meta.source.leadSource ?? "non renseignée") +
    row("Campagne", p.meta.source.utmCampaign ?? "—") +
    row("Support", p.meta.source.utmMedium ?? "—") +
    row("Appareil", p.meta.source.device ?? "—"),
)}

${p.meta.dossierUrl ? button(p.meta.dossierUrl, "Voir le dossier du lead") : ""}`;

  const text = [
    `NOUVEAU LEAD INSCRIT — ${p.meta.dateSimulationLabel}`,
    ``,
    `COORDONNÉES`,
    `- Prénom : ${p.identite.prenom}`,
    `- Email : ${p.identite.email}`,
    `- Téléphone : ${p.identite.telephone ?? "non renseigné"}`,
    `- Profil : ${p.identite.profilLabel}`,
    ``,
    `DONNÉES CLÉS`,
    `- TJM : ${
      p.activite.tjmMode === "fourchette" && p.activite.tjmFourchette
        ? `fourchette ${p.activite.tjmFourchette.label} (calcul ${eur(p.activite.tjmFourchette.mediane)})`
        : `${eur(p.activite.tjm)} exact`
    }`,
    `- Jours facturés : ${p.activite.joursFactures} / mois`,
    `- CA HT mensuel : ${eur(r.mensuel.caHt)}`,
    `- Foyer : ${p.foyer.situationLabel}, ${p.foyer.nombreDeParts} part(s), ${p.foyer.enfants} enfant(s)`,
    `- Avantages : ${p.avantages.avantagesInclus ? p.avantages.selection.map((a) => a.label).join(", ") : "aucun"}`,
    `- Perçu net mensuel : ${eur(r.mensuel.percuNet)}`,
    `- Rémunération globale : ${eur(r.mensuel.remunerationGlobale)}`,
    `- Taux de restitution : ${pct(r.tauxRestitution)}`,
    `- Écart (optimisé − actuel) : ${eurSigned(r.laisseSurLaTable)} / an`,
    ``,
    `SOURCE : ${p.meta.source.leadSource ?? "non renseignée"} · campagne ${p.meta.source.utmCampaign ?? "—"} · ${
      p.meta.source.device ?? "—"
    }`,
    ``,
    p.meta.dossierUrl ? `Dossier : ${p.meta.dossierUrl}` : ``,
    `Référence : ${p.meta.simulationId}`,
  ].join("\n");

  return {
    subject: `[Inscription] ${p.identite.prenom} — ${p.identite.telephone ?? p.identite.email}`,
    html: layout({
      title: "Nouveau lead inscrit",
      preheader: `${p.identite.prenom} · ${p.identite.email}`,
      body,
      footer: `Notification interne automatique — envoi séparé de l'email au lead (§5.1). Référence : ${esc(p.meta.simulationId)}.`,
    }),
    text,
  };
}
