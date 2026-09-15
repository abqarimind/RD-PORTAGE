/**
 * E1 — récapitulatif de simulation envoyé au lead.
 * E2 — copie intégrale au client interne (marketing@rdportage.com).
 *
 * E2 reprend EXACTEMENT le corps de E1, comme demandé le 08/09 (« le client
 * veut voir exactement ce que reçoit le lead »), avec un bandeau
 * d'identification en tête et un pied de page interne. Ce sont deux envois
 * distincts et non un Bcc : ils restent filtrables, et E2 part même si E1
 * échoue (§5.1).
 */
import type { SimulationResultPayload } from "@/types/simulation-result";
import { button, esc, eur, eurSigned, h2, layout, pct, row, table, MUTED } from "./layout";
import { rawBlock } from "./diagnostic";

/** Corps partagé E1 / E2 — une seule rédaction, deux destinataires. */
function corps(p: SimulationResultPayload, pourInterne: boolean): string {
  const r = p.resultats;
  const [actuel, portage, optimise] = r.scenarios;
  const ecartPositif = r.laisseSurLaTableSens === "gain";

  const entete = pourInterne
    ? `<p style="margin:0 0 16px 0;padding:10px 14px;background-color:#FFF1DE;border-radius:8px;font-size:13px;color:#0B0D12;">
         <strong>Copie interne</strong> — récapitulatif envoyé à ${esc(p.identite.prenom)} (${esc(p.identite.email)})${
           p.identite.telephone ? ` · ${esc(p.identite.telephone)}` : ""
         }.
       </p>`
    : "";

  // Profil sans situation actuelle : on présente le portage seul, sans
  // comparatif inventé (§4.3). Le champ vient du contrat de données.
  const accroche = !r.comparable
    ? `<p style="margin:0 0 8px 0;font-size:22px;font-weight:bold;line-height:1.3;">Votre vrai taux d'imposition du foyer : ${esc(
        pct(r.tauxMoyenImposition),
      )}.</p>
       <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:${MUTED};">Vous êtes en transition : il n'y a pas de situation actuelle à comparer, nous ne vous en inventons pas une. Voici ce que le portage RD optimisé vous rapporterait.</p>`
    : ecartPositif
    ? `<p style="margin:0 0 8px 0;font-size:22px;font-weight:bold;line-height:1.3;">Vous laissez ${esc(
        eur(Math.abs(r.laisseSurLaTable)),
      )} par an sur la table.</p>`
    : r.laisseSurLaTable < 0
      ? `<p style="margin:0 0 8px 0;font-size:22px;font-weight:bold;line-height:1.3;">À revenu égal, votre statut actuel vous laisse ${esc(
          eur(Math.abs(r.laisseSurLaTable)),
        )} de plus par an que le portage optimisé.</p>
         <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:${MUTED};">C'est le chiffre réel, sans arrondi à l'avantage du portage. Ce que le portage apporte en contrepartie ne se lit pas sur cette ligne : statut de salarié, assurance chômage, retraite et prévoyance, congés payés, sécurité juridique du contrat de travail.</p>`
      : `<p style="margin:0 0 8px 0;font-size:22px;font-weight:bold;line-height:1.3;">À revenu égal, les deux statuts vous laissent le même disponible annuel.</p>`;

  const tjmLigne =
    p.activite.tjmMode === "fourchette" && p.activite.tjmFourchette
      ? `Fourchette ${p.activite.tjmFourchette.label} (calcul sur ${eur(p.activite.tjmFourchette.mediane)})`
      : `${eur(p.activite.tjm)} (montant exact)`;

  const avantages = p.avantages.avantagesInclus
    ? p.avantages.selection
        .map((a) => row(`${a.label} (${a.fraisDeService})`, `${eur(a.montantNetMensuel)} net/mois`))
        .join("") + row("Total avantages", `${eur(p.avantages.totalNetMensuel)} net/mois`, true)
    : row("Avantages retenus", "aucun");

  return `${entete}
<p style="margin:0 0 4px 0;font-size:15px;">Bonjour ${esc(p.identite.prenom)},</p>
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">Voici le récapitulatif de votre simulation du ${esc(
    p.meta.dateSimulationLabel,
  )}.</p>

${accroche}
<p style="margin:0;font-size:14px;color:${MUTED};">Votre vrai taux d'imposition du foyer : <strong style="color:#0B0D12;">${esc(
    pct(r.tauxMoyenImposition),
  )}</strong> · TMI ${esc((r.tmi * 100).toFixed(0))} %.</p>

${p.meta.dossierUrl ? button(p.meta.dossierUrl, "Ouvrir mon dossier complet") : ""}

${h2("Votre situation")}
${table(
  row("Profil", p.identite.profilLabel) +
    row("TJM", tjmLigne) +
    row("Jours facturés", `${p.activite.joursFactures} / mois`) +
    row("Frais professionnels", `${eur(p.activite.fraisProMensuels)} / mois`) +
    row("Foyer", p.foyer.situationLabel) +
    row("Parts fiscales", String(p.foyer.nombreDeParts)) +
    row(
      "Enfants à charge",
      `${p.foyer.enfants}${p.foyer.enfantsGardeAlternee > 0 ? ` (dont ${p.foyer.enfantsGardeAlternee} en garde alternée)` : ""}`,
    ) +
    (p.foyer.revenuConjoint > 0 ? row("Revenu du conjoint", `${eur(p.foyer.revenuConjoint)} / an`) : "") +
    row("Mode de déduction", p.foyer.modeDeductionLabel) +
    (p.foyer.fraisReelsAnnuels > 0 ? row("Frais réels", `${eur(p.foyer.fraisReelsAnnuels)} / an`) : "") +
    (p.foyer.per > 0 ? row("Versements PER", `${eur(p.foyer.per)} / an`) : "") +
    (p.foyer.autresRevenus.foncier > 0 ? row("Revenus fonciers", `${eur(p.foyer.autresRevenus.foncier)} / an`) : "") +
    (p.foyer.autresRevenus.dons > 0 ? row("Dons", `${eur(p.foyer.autresRevenus.dons)} / an`) : ""),
)}

${h2("Vos avantages")}
${table(avantages)}

${h2("Votre rémunération, mois par mois")}
${table(
  row("CA HT", eur(r.mensuel.caHt)) +
    row("Frais de gestion RD", `− ${eur(r.mensuel.fraisDeGestion)}`) +
    row("Assurances & taxes", `− ${eur(r.mensuel.assurancesTaxes)}`) +
    row("Frais professionnels", `− ${eur(r.mensuel.fraisPro)}`) +
    row("Cagnotte avantages", `− ${eur(r.mensuel.cagnotte)}`) +
    row("Disponible compte d'activité", eur(r.mensuel.disponible)) +
    row("Salaire brut", eur(r.mensuel.brut)) +
    row("Cotisations salariales", `− ${eur(r.mensuel.cotisationsSalariales)}`) +
    row("Net versé", eur(r.mensuel.netVerse)) +
    (p.avantages.titresResto.inclus ? row("Titres-restaurant", `+ ${eur(r.mensuel.titresResto)}`) : "") +
    row("Perçu net", eur(r.mensuel.percuNet), true) +
    row("Rémunération globale", eur(r.mensuel.remunerationGlobale), true) +
    row("Taux de restitution", pct(r.tauxRestitution), true),
)}

${
  r.comparable
    ? `${h2("Les trois scénarios comparés")}
${table(
  row(actuel.label, `${eur(actuel.disponible)} / an`) +
    row(portage.label, `${eur(portage.disponible)} / an`) +
    row(optimise.label, `${eur(optimise.disponible)} / an`, true) +
    row("Écart (optimisé − actuel)", `${eurSigned(r.laisseSurLaTable)} / an`, true),
)}`
    : `${h2("Votre portage RD optimisé")}
${table(
  row("Net perçu", `${eur(optimise.netPercu)} / an`, true) +
    row("Avantages", `${eur(optimise.avantages)} / an`) +
    row("Impôt du foyer", `− ${eur(optimise.impotFoyer)} / an`) +
    row("Disponible", `${eur(optimise.disponible)} / an`, true),
)}`
}

${h2("Votre impôt")}
${table(
  row("Net imposable annuel", eur(r.netImposableAnnuel)) +
    row("Impôt net", eur(r.impotNet)) +
    row("Taux moyen d'imposition", pct(r.tauxMoyenImposition)) +
    row("Tranche marginale (TMI)", `${(r.tmi * 100).toFixed(0)} %`),
)}

<p style="margin:20px 0 0 0;font-size:13px;line-height:1.6;color:${MUTED};">Référence de simulation : ${esc(
    p.meta.simulationId,
  )}</p>`;
}

function texte(p: SimulationResultPayload): string {
  const r = p.resultats;
  const lignes = [
    `Bonjour ${p.identite.prenom},`,
    ``,
    `Récapitulatif de votre simulation du ${p.meta.dateSimulationLabel}.`,
    ``,
    !r.comparable
      ? `Votre vrai taux d'imposition du foyer : ${pct(r.tauxMoyenImposition)}. Vous êtes en transition : il n'y a pas de situation actuelle à comparer, nous ne vous en inventons pas une.`
      : r.laisseSurLaTableSens === "gain"
      ? `Vous laissez ${eur(Math.abs(r.laisseSurLaTable))} par an sur la table.`
      : r.laisseSurLaTable < 0
        ? `À revenu égal, votre statut actuel vous laisse ${eur(Math.abs(r.laisseSurLaTable))} de plus par an que le portage optimisé. En contrepartie, le portage apporte le statut de salarié, l'assurance chômage, la retraite et la prévoyance, les congés payés et la sécurité juridique du contrat de travail.`
        : `À revenu égal, les deux statuts vous laissent le même disponible annuel.`,
    ``,
    `Taux moyen d'imposition du foyer : ${pct(r.tauxMoyenImposition)} — TMI ${(r.tmi * 100).toFixed(0)} %.`,
    ``,
    `VOTRE SITUATION`,
    `- Profil : ${p.identite.profilLabel}`,
    `- TJM : ${
      p.activite.tjmMode === "fourchette" && p.activite.tjmFourchette
        ? `fourchette ${p.activite.tjmFourchette.label}, calcul sur ${eur(p.activite.tjmFourchette.mediane)}`
        : `${eur(p.activite.tjm)} (montant exact)`
    }`,
    `- Jours facturés : ${p.activite.joursFactures} / mois`,
    `- Foyer : ${p.foyer.situationLabel}, ${p.foyer.nombreDeParts} part(s), ${p.foyer.enfants} enfant(s)`,
    `- Mode de déduction : ${p.foyer.modeDeductionLabel}`,
    ``,
    `VOS AVANTAGES`,
    p.avantages.avantagesInclus
      ? p.avantages.selection.map((a) => `- ${a.label} : ${eur(a.montantNetMensuel)} net/mois (${a.fraisDeService})`).join("\n")
      : `- Aucun avantage retenu.`,
    ``,
    `VOTRE RÉMUNÉRATION MENSUELLE`,
    `- CA HT : ${eur(r.mensuel.caHt)}`,
    `- Disponible compte d'activité : ${eur(r.mensuel.disponible)}`,
    `- Salaire brut : ${eur(r.mensuel.brut)}`,
    `- Perçu net : ${eur(r.mensuel.percuNet)}`,
    `- Rémunération globale : ${eur(r.mensuel.remunerationGlobale)}`,
    `- Taux de restitution : ${pct(r.tauxRestitution)}`,
    ``,
    ...(r.comparable
      ? [
          `LES TROIS SCÉNARIOS (disponible annuel)`,
          ...r.scenarios.map((s) => `- ${s.label} : ${eur(s.disponible)}`),
          `- Écart (optimisé − actuel) : ${eurSigned(r.laisseSurLaTable)}`,
        ]
      : [
          `VOTRE PORTAGE RD OPTIMISÉ (annuel)`,
          `- Net perçu : ${eur(r.scenarios[2].netPercu)}`,
          `- Disponible : ${eur(r.scenarios[2].disponible)}`,
          `(Vous êtes en transition : pas de situation actuelle à comparer.)`,
        ]),
    ``,
    p.meta.dossierUrl ? `Votre dossier complet : ${p.meta.dossierUrl}` : ``,
    ``,
    p.meta.mentions.valeurIndicative,
    `Référence de simulation : ${p.meta.simulationId}`,
    `Politique de confidentialité : ${p.meta.mentions.politiqueConfidentialiteUrl}`,
  ];
  return lignes.filter((l) => l !== undefined).join("\n");
}

/** Pied RGPD de l'email au lead (§5.2). */
function piedLead(p: SimulationResultPayload, unsubscribeUrl?: string): string {
  return [
    esc(p.meta.mentions.valeurIndicative),
    `Vous recevez cet email parce que vous avez demandé votre simulation sur rd-portage.vercel.app. Vos données servent uniquement à établir cette simulation et à vous recontacter à ce sujet.`,
    `<a href="${esc(p.meta.mentions.politiqueConfidentialiteUrl)}" style="color:${MUTED};">Politique de confidentialité</a> · <a href="${esc(
      p.meta.mentions.mentionsLegalesUrl,
    )}" style="color:${MUTED};">Mentions légales</a>${
      unsubscribeUrl ? ` · <a href="${esc(unsubscribeUrl)}" style="color:${MUTED};">Se désinscrire</a>` : ""
    }`,
    `RD Portage — 1 rue George Stephenson, 78180 Montigny-le-Bretonneux · RCS Versailles 912 888 013`,
  ].join("<br>");
}

export function emailRecapLead(p: SimulationResultPayload, unsubscribeUrl?: string) {
  return {
    subject: `${p.identite.prenom}, votre simulation RD Portage`,
    html: layout({
      title: "Votre simulation RD Portage",
      preheader:
        p.resultats.comparable && p.resultats.laisseSurLaTableSens === "gain"
          ? `Vous laissez ${eur(Math.abs(p.resultats.laisseSurLaTable))} par an sur la table.`
          : `Votre vrai taux d'imposition du foyer : ${pct(p.resultats.tauxMoyenImposition)}.`,
      body: corps(p, false),
      footer: piedLead(p, unsubscribeUrl),
    }),
    text: texte(p),
  };
}

/**
 * E2 — copie interne. `alerte` est renseignée quand une écriture CRM a
 * échoué : l'email porte alors un bandeau visible et les données brutes du
 * lead, pour qu'il reste récupérable à la main plutôt que perdu (§4.2).
 */
export function emailRecapInterne(p: SimulationResultPayload, alerte?: string) {
  const bandeau = alerte
    ? `<p style="margin:0 0 16px 0;padding:12px 14px;background-color:#FDF6F5;border-left:4px solid #B3261E;font-size:13px;line-height:1.6;color:#B3261E;"><strong>Alerte technique — ${esc(
        alerte,
      )}</strong><br>Les données brutes du lead figurent en fin d'email : elles restent récupérables à la main.</p>`
    : "";
  return {
    subject: `${alerte ? "[ALERTE] " : ""}[Lead] Simulation — ${p.identite.prenom} (${p.identite.email})`,
    html: layout({
      title: "Copie interne — récapitulatif lead",
      preheader: `Copie du récapitulatif envoyé à ${p.identite.email}.`,
      body: bandeau + corps(p, true) + (alerte ? rawBlock(p) : ""),
      footer: `Copie interne automatique — envoi séparé de l'email au lead (§5.1). Référence : ${esc(p.meta.simulationId)}.`,
    }),
    text:
      (alerte ? `ALERTE TECHNIQUE — ${alerte}. Données brutes en fin d'email, récupérables à la main.\n\n` : "") +
      `COPIE INTERNE — récapitulatif envoyé à ${p.identite.prenom} <${p.identite.email}>${
        p.identite.telephone ? ` · ${p.identite.telephone}` : ""
      }\n\n${texte(p)}` +
      (alerte ? `\n\nDONNÉES BRUTES\n${JSON.stringify(p, null, 1)}` : ""),
  };
}
