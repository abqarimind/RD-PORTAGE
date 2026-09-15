# Recommandation d'outillage — RD Portage

Septembre 2026 · CRM, emailing, et back-office métier
Document d'aide à la décision. Prix relevés en septembre 2026, à revérifier
avant engagement.

---

## 0. Correction de la version précédente

La première version de cette note affirmait que **Resend ne savait pas envoyer
de séquence automatisée**, et recommandait Brevo principalement pour cette
raison. **C'était faux.** Je m'étais appuyé sur des comparatifs tiers plutôt
que sur la documentation de l'éditeur.

Resend a livré **Automations en avril 2026** : déclencheurs sur événement,
délais, conditions, branchements, séquences de plusieurs emails sur plusieurs
jours. **10 000 exécutions par mois sont incluses sur tous les plans**, puis
0,0015 $ l'unité. La séquence J0→J14 comptant six emails, cela couvre environ
1 600 leads par mois sans surcoût — très au-delà du volume attendu.

L'argument principal en faveur de Brevo tombe donc, et la recommandation
change. Le reste de la note (facturation électronique, ERP portage, avis sur
le CRM sur mesure, tunnel) reste valable.

---

## 1. La question n'est pas « quel CRM »

Quatre métiers différents sont en jeu. Les confondre est exactement ce qui
produit des outils qui se marchent dessus.

| # | Métier | Outil | État |
|---|---|---|---|
| 1 | **Email transactionnel** — récapitulatif, dossier, accusé de demande | Resend | ✅ en place |
| 2 | **Séquence de nurture J0→J14** | Resend Automations | ⚠️ **possible, mais pas encore paramétré** — les 6 emails sont écrits, rien ne les envoie |
| 3 | **Base de référence + suivi commercial** | *aucun en production* | 🔴 **les leads ne sont conservés nulle part** |
| 4 | **Back-office métier portage** — contrats, CRA, factures, paie | Excel | ⚠️ angle mort, et échéance légale |

Les lignes 1 et 2 relèvent désormais du **même outil**, ce qui règle la crainte
du doublon : l'email transactionnel et l'email marketing restent deux métiers
distincts, mais Resend sait faire les deux, et il est déjà intégré.


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

## 3. Recommandation

### Le contexte réel de RD Portage

Deux utilisateurs (Ridha au commerce, Linda à l'administratif), une trentaine
de portés depuis 2021, un cycle de vente court : lead → diagnostic 30 min →
proposition ferme → signature sous 48 h. Volume à venir modéré, même avec du
budget média.

C'est un profil où **le CRM le plus cher est presque toujours le mauvais
choix**, et où un outil trop riche ne sera jamais rempli.

### Ma recommandation : Resend seul, pour commencer

Resend couvre les trois besoins email **et** peut stocker les contacts :

| Besoin | Réponse Resend |
|---|---|
| Emails transactionnels | Déjà en place et testé |
| Séquence J0→J14 | Automations, 10 000 exécutions/mois incluses |
| Stockage des contacts | Audiences, création et mise à jour par API, propriétés personnalisées, import CSV |

**Avantages décisifs :** aucun nouveau compte, aucune nouvelle clé, aucun
nouveau domaine à vérifier, et une intégration qui existe déjà. Le branchement
côté code se limite à un adaptateur `resend` à côté des adaptateurs existants,
soit environ une demi-journée.

### Les trois limites à connaître avant de trancher

1. **Les propriétés personnalisées des contacts sont des paires clé/valeur en
   chaînes de caractères.** On peut y porter le TJM, le taux moyen, le profil,
   le téléphone — pas le détail complet de la simulation. Suffisant pour
   qu'un commercial rappelle quelqu'un, insuffisant comme archive.
2. **Ce n'est pas un CRM.** Pas de pipeline, pas de notes, pas de relance, pas
   d'assignation. C'est une liste de contacts. Ridha ne pourra pas
   « travailler » ses leads dedans.
3. **Le palier gratuit couvre 1 000 contacts**, mais l'envoi de diffusions
   demande un plan marketing payant (à partir de 40 $/mois pour 5 000
   contacts). **À confirmer auprès de Resend** : la page de tarifs ne dit pas
   explicitement si les emails envoyés par une Automation relèvent du même
   palier. C'est la seule inconnue de cette recommandation, et elle se lève
   par un message au support.

### Le CRM devient une décision séparée, et moins urgente

Aujourd'hui, le flux de travail de Ridha, c'est l'email de notification interne
avec le téléphone en tête : il le reçoit, il appelle. À une trentaine de portés
en cinq ans, un pipeline outillé peut attendre d'avoir du volume à gérer.

Quand ce moment viendra, le choix se fera sur le besoin réel :

| Outil | Prix indicatif (sept. 2026) | À préférer si… |
|---|---|---|
| **Pipedrive** | 14 → 29 $/utilisateur/mois | La discipline du pipeline commercial prime |
| **HubSpot Free** | 0 €, puis 15–20 $/siège | On veut le CRM gratuit le plus complet — attention au mur tarifaire, les prix ont doublé entre 2022 et 2026 |
| **Airtable** | 0 € → 20 $/siège | Linda veut un tableur et une archive complète de chaque simulation |
| **Brevo** | 0 € → ~18 $/mois | On préfère regrouper emails **et** CRM chez un éditeur français |
| **Sellsy / Axonaut** | ~30–50 €/mois | On veut CRM **+ facturation** français |

### Si l'archive complète compte dès maintenant : ajouter Airtable

Une seule raison de brancher Airtable en plus de Resend : **l'adaptateur
existant y stocke le payload complet de chaque simulation** dans un champ
`raw_json`, là où Resend ne retiendra que quelques propriétés en chaînes. Si
Ridha veut pouvoir rouvrir une simulation vieille de six mois, Airtable le
permet et Resend non. L'adaptateur est déjà écrit et fonctionne intégralement
en serverless, donc le coût est nul.

> ### ⚠️ Défaut relevé dans l'adaptateur Brevo
>
> Sans objet si vous suivez la recommandation ci-dessus, mais à savoir si vous
> choisissez Brevo plus tard : son adaptateur tient un **miroir en mémoire**
> des leads pour retrouver l'email à partir de l'identifiant. Sur Vercel, ce
> miroir est vide à chaque requête. La capture du lead et le déclenchement de
> séquence fonctionnent (même requête), mais la journalisation des événements,
> **la suppression d'un lead — un problème RGPD** — et l'export CSV ne font
> rien, en silence. Environ une demi-journée de correctifs.


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

**La séquence de nurture ne tourne pas.** Six emails sont rédigés, aucun ne
part. Sur un cycle où la décision se prend rarement le premier jour, c'est la
fuite la plus coûteuse du tunnel. Bonne nouvelle : l'outil pour la faire
tourner est déjà en place et déjà payé (Resend Automations) — il reste à la
paramétrer, pas à choisir un logiciel.

**La métrique suivie n'est pas la bonne.** À budget média, ce qui compte
n'est pas le coût par lead mais le **coût par diagnostic 30 min tenu**. Le
tunnel émet déjà les événements nécessaires (`rdv_clicked`, et désormais la
demande de diagnostic) : il reste à en faire le tableau de bord de décision.

### La règle à tenir avant d'ouvrir le budget média

Ne pas lancer tant que les leads ne sont pas stockés durablement. Un lead
payé qui disparaît dans un `Map` en mémoire est du budget jeté, et c'est le
seul verrou qui reste.

---

## 7. Ce que je recommande, dans l'ordre

1. **Cette semaine** — brancher les leads sur **Resend Audiences**
   (½ journée, aucun nouveau compte), poser `RESEND_API_KEY` et vérifier qu'un
   lead de test arrive bien. Sans cela, pas de budget média. Poser au passage
   la question au support Resend sur le palier applicable aux emails envoyés
   par une Automation.
2. **Cette semaine** — vérifier l'inscription auprès d'une plateforme agréée
   pour la facturation électronique. Obligation en vigueur depuis le 1ᵉʳ
   septembre.
3. **Sous 15 jours** — paramétrer la séquence J0→J14 dans Resend Automations.
   Les six emails sont déjà écrits.
4. **Sous 1 mois** — demander trois devis d'ERP portage (VSPortage, LAYA,
   PortageComp). C'est le vrai sujet logiciel de l'année.
5. **Quand le volume le justifiera** — choisir un CRM sur le besoin réel de
   suivi commercial, pas par anticipation. Ajouter Airtable plus tôt si
   l'archive complète des simulations compte dès maintenant (§3).
6. **Plus tard, si un besoin spécifique le justifie** — reparler du sur
   mesure, sur un périmètre métier et non sur un CRM générique.

---

### Sources

Prix et calendriers relevés en septembre 2026 ; à revérifier avant tout
engagement contractuel.

- Comparatifs CRM PME 2026 — [lelab0](https://lelab0.com/blog/comparatif-crm-pme-france-2026-pipedrive-hubspot-salesforce-sellsy/), [Publish IT](https://publish-it.fr/comparatif-crm-b2b-2026/), [Pragmatik](https://www.agencepragmatik.com/radar/meilleur-crm-pme-entrepreneurs-2026-comparatif)
- Tarifs HubSpot 2026 — [Resonate](https://www.resonatehq.com/hubspot-pricing), [EngageBay](https://www.engagebay.com/blog/hubspot-pricing/)
- Tarifs Airtable et Brevo 2026 — [TinyCommand](https://tinycommand.com/blogs/airtable-pricing-explained), [SaaS CRM Review](https://saascrmreview.com/brevo-pricing/)
- **Resend Automations** (source primaire, avril 2026) — [annonce](https://resend.com/blog/introducing-automations), [Audiences & Contacts](https://resend.com/docs/dashboard/audiences/introduction), [tarifs](https://resend.com/pricing)
- TJM développeurs freelances France 2026 — [RLN Consulting](https://rln-consulting.com/blog/tarifs-developpeur-freelance-2026), [La Fabrique du Net](https://www.lafabriquedunet.fr/agences/tendances/tarifs-des-developpeurs-freelances-dans-les-grandes-villes-de-france)
- Coût d'un CRM sur mesure — [Sokeo](https://sokeo.fr/cout-crm-entreprise-investissement-rentabilite/), [NoCode Factory](https://www.nocodefactory.fr/blog/combien-coute-developpement-outil-metier-sur-mesure)
- ERP portage salarial — [VSPortage](https://vsportage.com/fonctionnalites/metiers/portage-salarial/), [LAYA](https://www.laya.fr/logiciel-gestion-portage-salarial.html), [comparatif](https://www.lafabriquedunet.fr/logiciels/gestion/portage-salarial)
- Facturation électronique, calendrier officiel — [impots.gouv.fr](https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/2_gestion/290_facturation_electronique/guide_pratique_facturation_electronique.pdf), [Urssaf](https://www.urssaf.fr/accueil/actualites/facturation-electronique.html), [Pennylane](https://www.pennylane.com/fr/fiches-pratiques/facture-electronique/facturation-electronique-dates-cles-et-calendrier)
