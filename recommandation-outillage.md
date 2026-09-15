# Recommandation d'outillage — RD Portage

Septembre 2026 · CRM, emailing, et back-office métier
Document d'aide à la décision. Prix relevés en septembre 2026, à revérifier
avant engagement.

---

## 1. La question n'est pas « quel CRM »

Quatre métiers différents sont en jeu. Les confondre est exactement ce qui
produit des outils qui se marchent dessus.

| # | Métier | Outil aujourd'hui | État |
|---|---|---|---|
| 1 | **Email transactionnel** — récapitulatif, dossier, accusé de demande | Resend | ✅ en place |
| 2 | **Séquence de nurture J0→J14** | *aucun* | ⚠️ **les 6 emails sont écrits mais rien ne les envoie** |
| 3 | **Base de référence + pipeline commercial** | *aucun en production* | 🔴 **les leads ne sont conservés nulle part** |
| 4 | **Back-office métier portage** — contrats, CRA, factures, paie | Excel | ⚠️ angle mort, et échéance légale |

Les lignes 1 et 2 ne sont **pas** un doublon : l'email transactionnel et
l'email marketing sont deux métiers distincts (délivrabilité, réputation
d'envoi, idempotence, conformité). Les séparer est une bonne pratique, pas
un gaspillage.

En revanche, **Resend ne sait pas faire de séquence**. Pas de drip, pas de
déclencheur, pas de branchement conditionnel : uniquement des envois
unitaires et des diffusions ponctuelles. La séquence J0→J14 ne peut donc pas
tourner dessus sans développement spécifique. C'est le point qui doit
trancher le choix de la ligne 3.

---

## 2. Ce qui est plus urgent que le CRM : la facturation électronique

**Depuis le 1er septembre 2026 — soit il y a deux semaines — toute entreprise
assujettie à la TVA doit être en mesure de RECEVOIR ses factures au format
électronique, via une plateforme agréée.** Les TPE et PME sont concernées dès
cette première échéance, même si l'obligation d'*émettre* ne leur incombera
qu'au 1ᵉʳ septembre 2027.

Pour une société de portage salarial, qui facture ses clients pour le compte
de ses portés, ce n'est pas un détail administratif : c'est le cœur du flux.

**Aucun CRM ne répond à cette obligation.** Un CRM sur mesure non plus.

À vérifier auprès de Ridha, en priorité sur le choix du CRM :
1. RD Portage est-elle déjà inscrite auprès d'une plateforme agréée ?
2. Qui émettra les factures clients au format structuré (Factur-X, UBL, CII)
   à partir de septembre 2027 ?

---

## 3. Recommandation CRM

### Le contexte réel de RD Portage

Deux utilisateurs (Ridha au commerce, Linda à l'administratif), une trentaine
de portés depuis 2021, un cycle de vente court et simple : lead → diagnostic
30 min → proposition ferme → signature sous 48 h. Volume à venir modéré, même
avec du budget média.

C'est un profil où **le CRM le plus cher est presque toujours le mauvais
choix**, et où un outil trop riche ne sera jamais rempli.

### Ma recommandation : Brevo

| Critère | Pourquoi Brevo |
|---|---|
| Supprime le doublon | Séquence J0→J14 **+** base de contacts **+** CRM basique dans un seul outil |
| Coût | Gratuit jusqu'à un volume qu'ils n'atteindront pas avant longtemps, puis ~18 $/mois |
| Déjà codé | `lib/crm/brevo.ts` existe — le chemin critique fonctionne, **~½ journée de correctifs** (voir encadré) |
| Français | Éditeur français, support en français, hébergement UE, RGPD natif |
| Réversible | Export de contacts standard ; on ne s'enferme pas |

Resend reste sur le transactionnel. Deux outils, deux métiers, aucun
recouvrement.

**Réserve honnête :** le CRM de Brevo est correct, pas excellent. Si Ridha
veut un vrai pipeline commercial discipliné (prévisions, relances, rapports),
Brevo le frustrera. Dans ce cas, voir Pipedrive ci-dessous.

> ### ⚠️ Défaut relevé dans l'adaptateur Brevo — à corriger avant bascule
>
> En relisant le code pour cette recommandation, j'ai trouvé une limite que
> je n'avais pas signalée : l'adaptateur Brevo tient un **miroir en mémoire**
> des leads pour retrouver l'email à partir de l'identifiant. Sur Vercel, ce
> miroir est vide à chaque nouvelle requête.
>
> | Fonction | État sur Vercel |
> |---|---|
> | Enregistrement du lead | ✅ fonctionne — l'écriture et le miroir sont dans la même requête |
> | Déclenchement de la séquence | ✅ fonctionne — même requête que l'enregistrement |
> | Journalisation des événements de tunnel | ❌ ne fait rien, en silence |
> | **Suppression d'un lead** | ❌ **ne fait rien, en silence — problème RGPD** : une demande de suppression échouerait sans alerte |
> | Export CSV (`/api/export`) | ❌ renvoie un fichier vide |
>
> Le chemin critique — capter le lead et déclencher la séquence — fonctionne
> donc dès aujourd'hui. Les trois autres fonctions doivent chercher le
> contact par email via l'API Brevo au lieu du miroir : **environ une
> demi-journée**. La suppression est la plus urgente des trois.
>
> **L'adaptateur Airtable n'a pas ce défaut** : il interroge l'API à chaque
> fois (`findRecordId`) et fonctionne intégralement en serverless. C'est un
> argument concret en faveur d'Airtable pour démarrer sans délai.

### Les alternatives, et quand les préférer

| Outil | Prix indicatif (sept. 2026) | À préférer si… | Réserve |
|---|---|---|---|
| **Brevo** | 0 € → ~18 $/mois | La séquence marketing est le besoin n°1 | CRM basique |
| **Pipedrive** | 14 → 29 $/utilisateur/mois | La discipline du pipeline commercial prime | Ne fait pas le marketing |
| **HubSpot Free** | 0 €, puis 15–20 $/siège | On veut le CRM gratuit le plus complet | **Prix doublés entre 2022 et 2026** — le mur tarifaire arrive vite |
| **Airtable** | 0 € → 20 $/siège | Linda veut un tableur, et on veut démarrer demain | Ce n'est pas un CRM : ni relances, ni séquences |
| **Sellsy / Axonaut** | ~30–50 €/mois | On veut CRM **+ facturation** français | Recouvre partiellement l'ERP métier |

### Et la solution transitoire, si décider prend du temps

**Airtable**, pour trois raisons précises : l'adaptateur est **intégralement
fonctionnel en serverless** (contrairement à celui de Brevo, voir l'encadré
ci-dessus), Linda y retrouve un tableur qu'elle sait lire, et le champ
`raw_json` stocke le payload complet de chaque lead — donc **aucune donnée
n'est perdue lors d'une migration ultérieure**.

Compte tenu du défaut relevé, la séquence la plus sûre est :
**Airtable tout de suite** (zéro développement, persistance immédiate, on
arrête de perdre des leads), **puis Brevo** une fois les correctifs faits et
la séquence J0→J14 paramétrée. Airtable reste alors la base de référence, ou
est abandonné — les deux se défendent.

---

## 4. Le point aveugle : l'ERP métier portage

Un CRM gère des prospects. Il ne gère **ni les contrats de mission, ni les
comptes rendus d'activité, ni les comptes d'activité, ni la facturation
client, ni la préparation de la paie** — c'est-à-dire l'essentiel du travail
quotidien d'une société de portage.

Trois éditeurs français couvrent ce métier :

- **VSPortage (Veryswing)** — le plus établi sur le portage. A obtenu le
  label **Plateforme Agréée** par l'administration fiscale en janvier 2026,
  ce qui répond directement à l'échéance du §2.
- **LAYA (ORKE)** — plateforme en marque blanche, avec application mobile
  pour les portés (missions, factures, notes de frais).
- **PortageComp** — plus confidentiel.

Les tarifs ne sont pas publics : ils se négocient au nombre de portés. À une
trentaine de portés, il faut demander trois devis.

**C'est probablement leur vrai sujet logiciel des 12 prochains mois**, bien
avant le CRM.

---

## 5. Le CRM sur mesure — mon avis franc

### Ce que dit le marché

- TJM développeur freelance France 2026 : **~520 € en moyenne**, 550–750 €
  pour un profil confirmé.
- Fourchette constatée pour un CRM sur mesure : **5 000 € à 150 000 €**.
  5 000 € est le **plancher absolu** du marché.
- Les sources s'accordent : à 5 000 €, un MVP CRM est « possible mais très
  serré », et suppose un périmètre limité à 3–5 fonctionnalités.

### Verdict sur 4 900 € + 300 €/mois

**Le prix de construction est cohérent.** 4 900 € ≈ 8 à 9 jours au TJM du
marché. C'est tenable **uniquement parce qu'une grande partie du socle existe
déjà et a été payée** : schéma de lead validé, file d'écriture avec reprise,
journal, adaptateurs, export CSV. Le travail restant est l'interface, le
pipeline, l'authentification et les vues. Sur un projet vierge, ce serait
sous-évalué.

**La maintenance à 300 €/mois est le point qui coince.** 3 600 €/an, à
comparer à :

| | Coût annuel |
|---|---|
| Brevo (leur volume) | 0 € → ~216 € |
| Pipedrive, 2 utilisateurs | ~350 € |
| Airtable, 2 sièges | 0 € → ~480 € |
| **Maintenance du CRM sur mesure** | **3 600 €** |

La maintenance seule coûte **7 à 15 fois** l'abonnement de n'importe quelle
solution du marché, chaque année, indéfiniment.

### Le vrai problème n'est pas le prix, c'est l'ordre des priorités

Un CRM sur mesure ne répond ni à l'obligation de facturation électronique,
ni à la gestion des contrats, ni aux CRA, ni à la paie. Il résout le problème
le **moins urgent** des quatre, au **coût récurrent le plus élevé**, et crée
une dépendance à un prestataire unique pour une entreprise de deux personnes.

### Ce que je recommande de proposer à la place

Une **mise en service**, pas une construction :

> **Paramétrage CRM et reprise de données — 2 à 4 jours, 1 500 à 2 500 €**
> Choix de l'outil avec eux, configuration, branchement du tunnel existant,
> reprise du fichier Excel de Linda, formation d'une demi-journée,
> documentation de la procédure.

C'est immédiatement utile, sans risque, sans dépendance, et cela positionne
le rôle de conseil plutôt que de fournisseur. La proposition à 4 900 € reste
en réserve : si un besoin réellement spécifique apparaît, il sera
vraisemblablement **métier portage** (simulateur ↔ contrat ↔ CRA), et non un
CRM générique — et il se chiffrera alors sur un périmètre réel.

---

## 6. Le tunnel d'acquisition — ce qui est bon, ce qui manque

### Ce qui est déjà juste, et rare

Le tunnel construit est un **tunnel piloté par l'outil** : le simulateur est
l'offre, pas une barrière devant l'offre. Trois choses sont bien placées :

1. **La valeur précède l'email.** Le diagnostic flash donne un chiffre sans
   rien demander. C'est ce qui fait la différence avec les tunnels qui
   demandent l'email d'abord.
2. **L'email est demandé après le « aha », pas avant.** Les résultats
   s'affichent en entier ; le formulaire ne verrouille que le dossier détaillé.
3. **Le mécanisme est réellement différenciant.** « Votre vrai taux
   d'imposition de foyer » n'est calculé par aucun concurrent. C'est le seul
   angle défendable à long terme — l'écart en euros, lui, est contestable et
   peut jouer contre le produit.

### Les deux faiblesses structurelles

**La séquence de nurture n'existe pas.** Six emails sont rédigés, aucun ne
part. Sur un cycle où la décision se prend rarement le premier jour, c'est la
fuite la plus coûteuse du tunnel — et elle se répare en choisissant l'outil
du §3, pas en écrivant du code.

**La métrique suivie n'est pas la bonne.** À budget média, ce qui compte
n'est pas le coût par lead mais le **coût par diagnostic 30 min tenu**. Le
tunnel émet déjà les événements nécessaires (`rdv_clicked`, et désormais la
demande de diagnostic) : il reste à en faire le tableau de bord de décision.

### La règle à tenir avant d'ouvrir le budget média

Ne pas lancer tant que les leads ne sont pas stockés durablement. Un lead
payé qui disparaît dans un `Map` en mémoire est du budget jeté, et
l'arbitrage du §3 est le seul verrou qui reste.

---

## 7. Ce que je recommande, dans l'ordre

1. **Cette semaine** — brancher **Airtable** (adaptateur prêt, aucun
   développement, persistance immédiate), poser les clés, et vérifier qu'un
   lead de test arrive bien à destination. Sans cela, pas de budget média.
2. **Cette semaine** — vérifier l'inscription auprès d'une plateforme agréée
   pour la facturation électronique. Obligation en vigueur depuis le 1ᵉʳ
   septembre.
3. **Sous 15 jours** — corriger l'adaptateur Brevo (½ journée, la suppression
   RGPD en priorité) et brancher la séquence J0→J14 dessus.
4. **Sous 1 mois** — demander trois devis d'ERP portage (VSPortage, LAYA,
   PortageComp). C'est le vrai sujet logiciel de l'année.
5. **Plus tard, si un besoin spécifique le justifie** — reparler du sur
   mesure, sur un périmètre métier et non sur un CRM générique.

---

### Sources

Prix et calendriers relevés en septembre 2026 ; à revérifier avant tout
engagement contractuel.

- Comparatifs CRM PME 2026 — [lelab0](https://lelab0.com/blog/comparatif-crm-pme-france-2026-pipedrive-hubspot-salesforce-sellsy/), [Publish IT](https://publish-it.fr/comparatif-crm-b2b-2026/), [Pragmatik](https://www.agencepragmatik.com/radar/meilleur-crm-pme-entrepreneurs-2026-comparatif)
- Tarifs HubSpot 2026 — [Resonate](https://www.resonatehq.com/hubspot-pricing), [EngageBay](https://www.engagebay.com/blog/hubspot-pricing/)
- Tarifs Airtable et Brevo 2026 — [TinyCommand](https://tinycommand.com/blogs/airtable-pricing-explained), [SaaS CRM Review](https://saascrmreview.com/brevo-pricing/)
- Limites de Resend (absence d'automatisation) — [Flexprice](https://flexprice.io/blog/detailed-resend-pricing-guide), [Audienceful](https://www.audienceful.com/vs/resend)
- TJM développeurs freelances France 2026 — [RLN Consulting](https://rln-consulting.com/blog/tarifs-developpeur-freelance-2026), [La Fabrique du Net](https://www.lafabriquedunet.fr/agences/tendances/tarifs-des-developpeurs-freelances-dans-les-grandes-villes-de-france)
- Coût d'un CRM sur mesure — [Sokeo](https://sokeo.fr/cout-crm-entreprise-investissement-rentabilite/), [NoCode Factory](https://www.nocodefactory.fr/blog/combien-coute-developpement-outil-metier-sur-mesure)
- ERP portage salarial — [VSPortage](https://vsportage.com/fonctionnalites/metiers/portage-salarial/), [LAYA](https://www.laya.fr/logiciel-gestion-portage-salarial.html), [comparatif](https://www.lafabriquedunet.fr/logiciels/gestion/portage-salarial)
- Facturation électronique, calendrier officiel — [impots.gouv.fr](https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/2_gestion/290_facturation_electronique/guide_pratique_facturation_electronique.pdf), [Urssaf](https://www.urssaf.fr/accueil/actualites/facturation-electronique.html), [Pennylane](https://www.pennylane.com/fr/fiches-pratiques/facture-electronique/facturation-electronique-dates-cles-et-calendrier)
