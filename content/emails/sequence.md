# Séquence prospects J3 → J14 (Resend)

> Décidée le 25/09 et envoyée à l'équipe pour validation.
> **Tant que l'équipe n'a pas validé, rien n'est activé.**
> Elle remplace l'ancienne séquence de 6 emails HTML écrite pour Brevo (voir l'historique Git).

## Principes

- Séquence courte : 4 envois sur 14 jours, en texte simple.
- Un email = une conviction, dans cet ordre : le chiffre est réel → ça ne se fait pas seul → mon frein n'en est pas un → attendre coûte.
- Une seule question par email, à laquelle on répond d'un mot. Aucun lien (sauf la désinscription), aucun HTML, aucun suivi d'ouverture.
- On mesure les rendez-vous obtenus, pas les ouvertures.
- 50 à 125 mots, signé Ridha Chammam. **Uniquement des faits sourcés.**
- Les données d'entreprise (téléphone, frais, plafond micro, adresse, cas type) ne sont jamais recopiées : elles viennent de `config/` au chargement (jetons `%…%`, voir `lib/email/sequence.ts`).
- Les règles sont vérifiées par `lib/email/__tests__/sequence.test.ts` : longueur, absence de lien, question finale, pied légal, faits interdits.

## Plan

| Jour | Contact | Fichier | Objet | Conviction |
|---|---|---|---|---|
| J0 | Récapitulatif de simulation (E1, inchangé) | — | — | — |
| J1 | Appel de l'équipe, si le prospect a laissé son numéro | — | — | — |
| J3 | Email 1 | `j03-legal.txt` | C'est vraiment légal ? | Ce chiffre est réel, et il me concerne |
| J6 | Email 2 | `j06-urssaf.txt` | Et si l'URSSAF contrôle ? | Ça ne se fait pas seul, et mal fait, ça coûte cher |
| J10 | Email 3 — une version par statut | `j10-*.txt` | Et votre … ? | Ce qui me retenait n'est pas un vrai obstacle |
| J14 | Email 4 | `j14-fermeture*.txt` | Je ferme votre dossier ? | Attendre me coûte chaque mois |

### Email 3 (J10) : les 5 variantes, selon `statut_actuel`

| `statut_actuel` | Fichier | Objet | Frein levé |
|---|---|---|---|
| `salarie_esn` | `j10-salarie-esn.txt` | Et votre CDI ? | En portage, on reste salarié, avec la protection sociale |
| `freelance_micro` | `j10-freelance-micro.txt` | Et vos plafonds ? | Plus de plafond de CA, plus de déclarations |
| `freelance_sasu` | `j10-freelance-sasu.txt` | Et votre société ? | Plus de comptabilité ni de juridique |
| `porte_ailleurs` | `j10-porte-ailleurs.txt` | Et votre mission en cours ? | On change de société de portage sans perdre son client |
| `transition` (et repli) | `j10-transition.txt` | Et si la mission n'est pas encore signée ? | On prépare tout avant, pour signer dès qu'elle arrive |

⚠️ **À confirmer par l'équipe** : ces freins et ces réponses. Chaque fichier se modifie librement.
⚠️ **À fournir** : un vrai cas client par variante (marqueurs `[[CAS CLIENT À FOURNIR…]]`), avec l'accord du client. Le chargement est refusé tant qu'un marqueur subsiste.

### Email 4 (J14) : deux versions

- `j14-fermeture.txt` quand `economie_mensuelle > 0` : « environ X € laissés chaque mois ».
- `j14-fermeture-sans-ecart.txt` sinon : à revenu égal, la micro-entreprise peut rester plus favorable, et l'on n'annonce jamais un gain qui n'existe pas.

## Variables

| Dans l'email | Remplacée par | Source |
|---|---|---|
| `{{{PRENOM}}}` | Resend, à l'envoi | `contact.first_name` |
| `{{{ECONOMIE_MENSUELLE}}}` | Resend, à l'envoi | `contact.properties.economie_mensuelle` = arrondi(`economie_annuelle_eur` ÷ 12), posé par `lib/crm/resend.ts` |
| `{{{RESEND_UNSUBSCRIBE_URL}}}` | Resend, à l'envoi | lien de désinscription natif (obligatoire dans chaque modèle) |
| `%TELEPHONE%`, `%FRAIS%`, `%LIGNE_LEGALE%` | le script de chargement | `config/contact.ts` |
| `%PLAFOND_MICRO%` | le script de chargement | `config/fiscal-2026.ts` (83 600 € en 2026, source URSSAF) |
| `%CAS_TYPE%` | le script de chargement | recalculé par le moteur (63 % avant impôt, cagnotte comprise) |
| `%LINKEDIN_RIDHA%` | le script de chargement | variable `RIDHA_LINKEDIN_URL` — **URL manquante**, la ligne est retirée tant qu'elle est vide |

## Qui entre dans la séquence

Uniquement les prospects qui ont coché la case **facultative** des conseils (#10). `/api/lead` n'envoie l'événement de déclenchement (`RESEND_SEQUENCE_EVENT`, défaut `sequence_j14`) que si `consent.marketing_optin` est vrai, et le contact est créé `unsubscribed: true` sinon.

## Conditions d'arrêt

La séquence s'arrête dès que le prospect :

| Événement | Comment c'est détecté |
|---|---|
| demande son Diagnostic | **automatique** : `/api/demande-diagnostic` pose `sequence_stop = "oui"` sur le contact |
| répond à un email | **à la main** : l'équipe met `sequence_stop` à `oui` sur le contact dans Resend |
| est joint par téléphone | **à la main** : idem |
| se désinscrit | **automatique** : lien Resend, ou lien du site (`/api/desinscription`) qui pose aussi `sequence_stop = "oui"` |

Fonctionnement retenu : les Automations Resend savent évaluer une condition sur une propriété du contact (`contact.properties.…`). **Avant chaque envoi**, une étape « condition » teste `sequence_stop = oui` OU `unsubscribed = true` ; si c'est le cas, le parcours s'arrête là. Pas de mécanisme de sortie globale à maintenir : la vérification est répétée avant chaque email.

## Procédure de chargement

1. Faire valider les textes par l'équipe et remplacer les 5 marqueurs `[[CAS CLIENT À FOURNIR…]]` par de vrais cas clients (accord écrit).
2. Renseigner `RIDHA_LINKEDIN_URL` si l'URL est disponible.
3. Aperçu : `npx tsx scripts/resend-sequence.ts` (ne crée rien).
4. Chargement : avec `RESEND_API_KEY`, `MAIL_FROM` et `MAIL_REPLY_TO` définis, `npx tsx scripts/resend-sequence.ts --appliquer`. Le script crée et publie les 9 modèles, puis l'automation **en statut « disabled »**. Si la création de l'automation échoue, les modèles restent créés : recréer à la main dans Resend → Automations le parcours décrit ci-dessus (déclencheur `sequence_j14` → délai 3 jours → [arrêt ?] → J3 → délai 3 jours → [arrêt ?] → J6 → délai 4 jours → [arrêt ?] → branche par `statut_actuel` → délai 4 jours → [arrêt ?] → branche `economie_mensuelle > 0`).
5. Dans Resend : ouvrir l'automation, **envoyer un test** à une adresse interne pour chaque branche, vérifier le prénom, le montant et le lien de désinscription.
6. **Activer seulement après validation de l'équipe.**

Points à vérifier au premier chargement (formats Resend documentés mais pas encore éprouvés sur ce compte) : le chemin `contact.properties.sequence_stop` dans les conditions et `contact.first_name` dans les variables.
