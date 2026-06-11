# Séquence 14 jours — objets, préheaders, variantes A/B

Voix : Ridha Chammam, fondateur, ex-consultant porté. 1 email = 1 idée = 1 CTA.
Alternance stricte Atarhib (peur factuelle) / Targhib (désir factuel).

## Variables (attributs Brevo, écrits par l'adapter CRM)

| Variable funnel | Attribut Brevo |
|---|---|
| {prenom} | `{{ contact.PRENOM }}` |
| {economie_annuelle} | `{{ contact.ECONOMIE_ANNUELLE }}` |
| {statut_actuel} | `{{ contact.STATUT_ACTUEL }}` |
| {scenario_optimal} | `{{ contact.SCENARIO_OPTIMAL }}` |

Tous les liens portent `utm_source=brevo&utm_medium=email&utm_campaign=seq14_jN`.

| Jour | Fichiers | Objet (A) | Objet (B) | Préheader |
|---|---|---|---|---|
| J0 | `j0-livraison` | Votre simulation détaillée, {prenom} | {prenom}, votre chiffre : {economie_annuelle} €/an | Le détail de vos 3 scénarios, calculé sur votre foyer réel. |
| J2 | `j2-atarhib-2024` | Ce qui a changé en 2024 (et qu'on ne vous a peut-être pas dit) | Redressement URSSAF : qui paie, maintenant ? | Depuis 2024, la régularisation touche votre paie. Les faits. |
| J4 | `j4-targhib-18000` | Les 18 000 € que le cadre légal vous autorise | 18 000 €/an, sans zone grise : le détail | Cagnotte avantages, titres-restaurant, mobilité : plafonds et conditions. |
| J7 | `j7-histoire-ridha` | J'étais à votre place | D'ESN à porté : ce que j'aurais aimé savoir | Mon parcours, et un avant/après chiffré (cas client anonymisé). |
| J10 | `j10-atarhib-3-signaux` | Les 3 signaux qu'un montage va vous coûter cher | Cash, CPF, offshore : les 3 signaux d'alerte | Si vous entendez l'une de ces 3 phrases, méfiez-vous. |
| J14 | `j14-cloture-rdv` | Votre taux réel, validé en 30 minutes | Dernière étape : 30 minutes, un chiffre ferme | Diagnostic 30 min avec moi → proposition ferme sous 48 h. 4 % de frais. |

## Procédure de chargement Brevo

1. Créer 6 templates transactionnels/marketing, coller le HTML de chaque fichier `.html`,
   la version texte depuis le `.txt`.
2. Créer une automation « seq14 » déclenchée par l'ajout à la liste
   `BREVO_SEQ14_LIST_ID`, délais 0/2/4/7/10/14 jours.
3. Le lien de désinscription `{{ unsubscribe }}` et l'adresse postale sont déjà
   dans chaque footer (obligation légale).
