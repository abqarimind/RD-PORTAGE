/**
 * E3 — « votre demande de diagnostic est reçue », envoyée au lead.
 * E4 — « nouvelle demande de diagnostic », envoyée à l'équipe.
 *
 * Ces deux envois s'appelaient jusqu'ici « confirmation d'inscription ». Le
 * nom était faux : dans ce tunnel, l'inscription EST le lead gate, et elle
 * est déjà couverte par E1/E2. Le clic sur « Valider ce chiffre — Diagnostic
 * 30 min » est un acte différent et plus fort — une demande de rendez-vous.
 * Le couple E3/E4 signale donc un lead plus chaud, il ne double pas E1/E2.
 *
 * Comme E1/E2 : deux envois séparés et non un Bcc, filtrables, et E4 part
 * même si E3 échoue.
 */
import type { SimulationResultPayload } from "@/types/simulation-result";
import { button, esc, eur, eurSigned, h2, layout, pct, row, table, MUTED } from "./layout";

const PHONE_LABEL = "06 32 98 87 23";
/** Engagement de rappel affiché au lead — tenu par Ridha. */
const DELAI_RAPPEL = "sous 24 h ouvrées";

export function emailDemandeDiagnosticLead(p: SimulationResultPayload, unsubscribeUrl?: string) {
  const body = `
<p style="margin:0 0 4px 0;font-size:15px;">Bonjour ${esc(p.identite.prenom)},</p>
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">Votre demande de diagnostic est bien reçue. Ridha vous rappelle <strong>${esc(
    DELAI_RAPPEL,
  )}</strong> au numéro que vous avez indiqué${p.identite.telephone ? ` (${esc(p.identite.telephone)})` : ""}.</p>

${h2("Ce qui sera préparé avant l'appel")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 16px 0;">
  <tr><td style="padding:10px 0;border-bottom:1px solid #ECEEF3;font-size:14px;line-height:1.6;"><strong>Votre simulation, revérifiée à la main</strong><br><span style="color:${MUTED};">Ridha reprend votre foyer, vos frais réels et vos leviers, et confirme — ou corrige — le chiffre que vous avez obtenu.</span></td></tr>
  <tr><td style="padding:10px 0;border-bottom:1px solid #ECEEF3;font-size:14px;line-height:1.6;"><strong>Les optimisations applicables à votre cas</strong><br><span style="color:${MUTED};">Cagnotte d'avantages, frais professionnels, PER : ce qui s'applique vraiment chez vous, et à quelle hauteur.</span></td></tr>
  <tr><td style="padding:10px 0;font-size:14px;line-height:1.6;"><strong>Une proposition ferme</strong><br><span style="color:${MUTED};">Chiffrée, sans engagement. Si elle vous convient, la signature est possible sous 48 h.</span></td></tr>
</table>

<p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;">L'échange dure 30 minutes. Prévoyez votre dernier bulletin ou votre dernier bilan si vous l'avez sous la main : ce n'est pas obligatoire, mais cela rend le chiffrage plus précis.</p>

${p.meta.dossierUrl ? button(p.meta.dossierUrl, "Revoir mon dossier") : ""}

<p style="margin:16px 0 0 0;font-size:14px;line-height:1.6;">Besoin de décaler, ou une question d'ici là ? Répondez simplement à cet email, ou appelez Ridha au ${PHONE_LABEL}.</p>

<p style="margin:20px 0 0 0;font-size:13px;color:${MUTED};">Référence de simulation : ${esc(p.meta.simulationId)}</p>`;

  const footer = [
    esc(p.meta.mentions.valeurIndicative),
    `Vous recevez cet email à la suite de votre demande de diagnostic sur rd-portage.vercel.app.`,
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
    `Votre demande de diagnostic est bien reçue. Ridha vous rappelle ${DELAI_RAPPEL}${
      p.identite.telephone ? ` au ${p.identite.telephone}` : ""
    }.`,
    ``,
    `CE QUI SERA PRÉPARÉ AVANT L'APPEL`,
    `1. Votre simulation, revérifiée à la main — foyer, frais réels, leviers.`,
    `2. Les optimisations applicables à votre cas — cagnotte, frais professionnels, PER.`,
    `3. Une proposition ferme, chiffrée et sans engagement. Signature possible sous 48 h.`,
    ``,
    `L'échange dure 30 minutes. Prévoyez votre dernier bulletin ou bilan si vous l'avez : ce n'est pas obligatoire, mais le chiffrage sera plus précis.`,
    ``,
    p.meta.dossierUrl ? `Revoir votre dossier : ${p.meta.dossierUrl}` : ``,
    ``,
    `Besoin de décaler ou une question ? Répondez à cet email, ou appelez Ridha au ${PHONE_LABEL}.`,
    ``,
    p.meta.mentions.valeurIndicative,
    `Référence de simulation : ${p.meta.simulationId}`,
    `Politique de confidentialité : ${p.meta.mentions.politiqueConfidentialiteUrl}`,
  ].join("\n");

  return {
    subject: `${p.identite.prenom}, votre demande de diagnostic est reçue`,
    html: layout({
      title: "Votre demande de diagnostic est reçue",
      preheader: `Ridha vous rappelle ${DELAI_RAPPEL}.`,
      body,
      footer,
    }),
    text,
  };
}

/**
 * E4 — notification interne. Le lead a demandé un rendez-vous : c'est le
 * signal le plus chaud du tunnel, d'où les coordonnées en tête.
 */
export function emailDemandeDiagnosticInterne(p: SimulationResultPayload, alerte?: string) {
  const r = p.resultats;
  const body = `
${
  alerte
    ? `<p style="margin:0 0 16px 0;padding:12px 14px;background-color:#FDF6F5;border-left:4px solid #B3261E;font-size:13px;line-height:1.6;color:#B3261E;"><strong>Alerte technique — ${esc(
        alerte,
      )}</strong><br>Les données brutes du lead figurent en fin d'email : elles restent récupérables à la main.</p>`
    : ""
}
<p style="margin:0 0 16px 0;padding:10px 14px;background-color:#FFF1DE;border-radius:8px;font-size:14px;">
  <strong>Demande de diagnostic</strong> — ${esc(p.meta.dateSimulationLabel)} · à rappeler ${esc(DELAI_RAPPEL)}
</p>

${h2("Coordonnées")}
${table(
  row("Prénom", p.identite.prenom, true) +
    row("Téléphone", p.identite.telephone ?? "non renseigné", !!p.identite.telephone) +
    row("Email", p.identite.email, true) +
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
    (r.comparable
      ? row("Écart (optimisé − actuel)", `${eurSigned(r.laisseSurLaTable)} / an`, true)
      : row("Écart", "sans objet — profil en transition")),
)}

${h2("Source")}
${table(
  row("Origine", p.meta.source.leadSource ?? "non renseignée") +
    row("Campagne", p.meta.source.utmCampaign ?? "—") +
    row("Support", p.meta.source.utmMedium ?? "—") +
    row("Appareil", p.meta.source.device ?? "—"),
)}

${p.meta.dossierUrl ? button(p.meta.dossierUrl, "Voir le dossier du lead") : ""}
${alerte ? rawBlock(p) : ""}`;

  const text = [
    alerte ? `ALERTE TECHNIQUE — ${alerte}. Données brutes en fin d'email, récupérables à la main.` : ``,
    `DEMANDE DE DIAGNOSTIC — ${p.meta.dateSimulationLabel} · à rappeler ${DELAI_RAPPEL}`,
    ``,
    `COORDONNÉES`,
    `- Prénom : ${p.identite.prenom}`,
    `- Téléphone : ${p.identite.telephone ?? "non renseigné"}`,
    `- Email : ${p.identite.email}`,
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
    r.comparable ? `- Écart (optimisé − actuel) : ${eurSigned(r.laisseSurLaTable)} / an` : `- Écart : sans objet (profil en transition)`,
    ``,
    `SOURCE : ${p.meta.source.leadSource ?? "non renseignée"} · campagne ${p.meta.source.utmCampaign ?? "—"} · ${
      p.meta.source.device ?? "—"
    }`,
    ``,
    p.meta.dossierUrl ? `Dossier : ${p.meta.dossierUrl}` : ``,
    `Référence : ${p.meta.simulationId}`,
    alerte ? `\nDONNÉES BRUTES\n${JSON.stringify(p, null, 1)}` : ``,
  ]
    .filter((l) => l !== "")
    .join("\n");

  return {
    subject: `${alerte ? "[ALERTE] " : ""}[Diagnostic] ${p.identite.prenom} — ${p.identite.telephone ?? p.identite.email}`,
    html: layout({
      title: "Nouvelle demande de diagnostic",
      preheader: `${p.identite.prenom} · ${p.identite.telephone ?? p.identite.email} · à rappeler ${DELAI_RAPPEL}`,
      body,
      footer: `Notification interne automatique — envoi séparé de l'email au lead (§5.1). Référence : ${esc(
        p.meta.simulationId,
      )}.`,
    }),
    text,
  };
}

/**
 * Données brutes, jointes UNIQUEMENT quand une écriture CRM a échoué : c'est
 * le filet qui rend le lead récupérable à la main plutôt que perdu (§4.2).
 */
export function rawBlock(p: SimulationResultPayload): string {
  return `<div style="margin-top:20px;padding:12px;background-color:#FAFBFD;border:1px solid #ECEEF3;border-radius:8px;">
  <p style="margin:0 0 6px 0;font-size:12px;font-weight:bold;color:${MUTED};">DONNÉES BRUTES — à ressaisir dans le CRM</p>
  <pre style="margin:0;font-family:monospace;font-size:11px;line-height:1.4;white-space:pre-wrap;word-break:break-all;color:#0B0D12;">${esc(
    JSON.stringify(p, null, 1),
  )}</pre>
</div>`;
}
