/**
 * Charge la séquence prospects dans Resend — SANS L'ACTIVER.
 *
 *   npx tsx scripts/resend-sequence.ts               → aperçu (rien n'est créé)
 *   npx tsx scripts/resend-sequence.ts --appliquer   → crée les modèles et
 *                                                      l'automation, DÉSACTIVÉE
 *
 * Garde-fous :
 *  - refuse de charger tant qu'un contenu « [[… À FOURNIR …]] » subsiste ;
 *  - l'automation est créée avec status « disabled » : l'activer reste un
 *    geste manuel dans le tableau de bord, après validation de l'équipe.
 *
 * Variables : RESEND_API_KEY, MAIL_FROM, MAIL_REPLY_TO (défaut marketing@),
 * RESEND_SEQUENCE_EVENT (défaut sequence_j14).
 * Procédure complète : content/emails/sequence.md.
 */
import { Resend } from "resend";
import { EMAIL_ENTREPRISE } from "@/config/contact";
import { aCompleter, loadSequence, type SequenceEmail } from "@/lib/email/sequence";

const appliquer = process.argv.includes("--appliquer");
const emails = loadSequence();
const evenement = process.env.RESEND_SEQUENCE_EVENT || "sequence_j14";

/* ——— garde-fou contenu ——— */
const manquants = emails.flatMap((e) => aCompleter(e).map((m) => `${e.id} : ${m}`));
for (const e of emails) console.log(`J${e.jour}\t${e.id}\t« ${e.objet} »${e.statut ? `\t[statut ${e.statut}]` : ""}${e.condition ? `\t[${e.condition}]` : ""}`);
if (manquants.length > 0) {
  console.warn(`\n${manquants.length} contenu(s) encore à fournir :\n- ${manquants.join("\n- ")}`);
}
if (!appliquer) {
  console.log("\nAperçu uniquement. Relancer avec --appliquer pour créer les modèles et l'automation (désactivée).");
  process.exit(0);
}
if (manquants.length > 0) {
  console.error("\nChargement refusé : complétez d'abord les contenus marqués [[…]].");
  process.exit(1);
}

async function main() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("RESEND_API_KEY manquante.");
    process.exit(1);
  }
  const resend = new Resend(key);
  const from = process.env.MAIL_FROM;
  const replyTo = process.env.MAIL_REPLY_TO || EMAIL_ENTREPRISE;

  /* ——— 1. modèles ——— */
  async function creerModele(e: SequenceEmail): Promise<string> {
    const res = await resend.templates.create({
      name: `Séquence prospects — ${e.id}`,
      subject: e.objet,
      html: e.html,
      text: e.text,
      ...(from ? { from } : {}),
      replyTo,
      variables: [
        { key: "PRENOM", type: "string", fallbackValue: "" },
        ...(e.text.includes("{{{ECONOMIE_MENSUELLE}}}") ? [{ key: "ECONOMIE_MENSUELLE", type: "number" as const, fallbackValue: 0 }] : []),
      ],
    });
    if (res.error || !res.data) throw new Error(`${e.id} : ${JSON.stringify(res.error)}`);
    const pub = await resend.templates.publish(res.data.id);
    if (pub.error) throw new Error(`${e.id} (publication) : ${JSON.stringify(pub.error)}`);
    console.log(`modèle créé : ${e.id} → ${res.data.id}`);
    return res.data.id;
  }

  const ids: Record<string, string> = {};
  for (const e of emails) ids[e.id] = await creerModele(e);

  /* ——— 2. automation ——— */
  type Step = Parameters<Resend["automations"]["create"]>[0]["steps"][number];
  type Connection = Parameters<Resend["automations"]["create"]>[0]["connections"][number];
  const steps: Step[] = [];
  const connections: Connection[] = [];
  const relier = (from: string, to: string, type?: Connection["type"]) => connections.push({ from, to, ...(type ? { type } : {}) });

  /** Arrêt : demande de Diagnostic, réponse, appel (sequence_stop = oui) ou désinscription. */
  const arret = (cle: string): Step => ({
    key: cle,
    type: "condition",
    config: {
      type: "or",
      rules: [
        { type: "rule", field: "contact.properties.sequence_stop", operator: "eq", value: "oui" },
        { type: "rule", field: "contact.unsubscribed", operator: "eq", value: true },
      ],
    },
  });
  const envoi = (cle: string, e: SequenceEmail): Step => ({
    key: cle,
    type: "send_email",
    config: {
      template: {
        id: ids[e.id],
        variables: {
          PRENOM: { var: "contact.first_name" },
          ...(e.text.includes("{{{ECONOMIE_MENSUELLE}}}") ? { ECONOMIE_MENSUELLE: { var: "contact.properties.economie_mensuelle" } } : {}),
        },
      },
    },
  });
  const par = (predicat: (e: SequenceEmail) => boolean) => {
    const e = emails.find(predicat);
    if (!e) throw new Error("email introuvable");
    return e;
  };

  steps.push({ key: "declencheur", type: "trigger", config: { eventName: evenement } });
  steps.push({ key: "attente_j3", type: "delay", config: { duration: "3 days" } });
  relier("declencheur", "attente_j3");

  // J3 et J6 : un seul email chacun.
  let precedent = "attente_j3";
  for (const [jour, suivant, attente] of [
    [3, "attente_j6", "3 days"],
    [6, "attente_j10", "4 days"],
  ] as const) {
    steps.push(arret(`arret_j${jour}`), envoi(`email_j${jour}`, par((e) => e.jour === jour)));
    steps.push({ key: suivant, type: "delay", config: { duration: attente } });
    relier(precedent, `arret_j${jour}`);
    relier(`arret_j${jour}`, `email_j${jour}`, "condition_not_met");
    relier(`email_j${jour}`, suivant);
    precedent = suivant;
  }

  // J10 : une branche par statut_actuel (repli : transition).
  steps.push(arret("arret_j10"), { key: "attente_j14", type: "delay", config: { duration: "4 days" } });
  relier(precedent, "arret_j10");
  const variantes = emails.filter((e) => e.jour === 10 && e.statut !== "transition");
  let branche = "arret_j10";
  let typeBranche: Connection["type"] = "condition_not_met";
  for (const v of variantes) {
    const test = `statut_${v.statut}`;
    steps.push({ key: test, type: "condition", config: { type: "rule", field: "contact.properties.statut_actuel", operator: "eq", value: v.statut ?? "" } });
    steps.push(envoi(`email_j10_${v.statut}`, v));
    relier(branche, test, typeBranche);
    relier(test, `email_j10_${v.statut}`, "condition_met");
    relier(`email_j10_${v.statut}`, "attente_j14");
    branche = test;
    typeBranche = "condition_not_met";
  }
  steps.push(envoi("email_j10_transition", par((e) => e.jour === 10 && e.statut === "transition")));
  relier(branche, "email_j10_transition", "condition_not_met");
  relier("email_j10_transition", "attente_j14");

  // J14 : avec ou sans écart chiffré.
  steps.push(
    arret("arret_j14"),
    { key: "ecart_positif", type: "condition", config: { type: "rule", field: "contact.properties.economie_mensuelle", operator: "gt", value: 0 } },
    envoi("email_j14", par((e) => e.jour === 14 && e.condition === "economie_mensuelle > 0")),
    envoi("email_j14_sans_ecart", par((e) => e.jour === 14 && e.condition === "economie_mensuelle <= 0")),
  );
  relier("attente_j14", "arret_j14");
  relier("arret_j14", "ecart_positif", "condition_not_met");
  relier("ecart_positif", "email_j14", "condition_met");
  relier("ecart_positif", "email_j14_sans_ecart", "condition_not_met");

  const res = await resend.automations.create({ name: "Séquence prospects J3 → J14", status: "disabled", steps, connections });
  if (res.error || !res.data) {
    console.error("Automation non créée :", JSON.stringify(res.error));
    console.error("Les modèles sont créés : terminez l'automation à la main (content/emails/sequence.md, étape 4).");
    process.exit(1);
  }
  console.log(`\nAutomation créée DÉSACTIVÉE : ${res.data.id}. Ne l'activez qu'après validation de l'équipe.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
