# Rapport — raccordement du diagnostic flash & arbitrages

Session du 15/09/2026 (suite) · branche `claude/new-session-xtn0ey`
Fait suite à `rapport-maintenance.md`. Traite le §3 (raccordement), le §4
(arbitrages), le §5 (bugs signalés) et le §6 (Resend) du brief.

---

## 0. Résumé

| Sujet | État |
|---|---|
| Relais diagnostic → simulateur | Fait — plus aucune question posée deux fois |
| E3/E4 renommés « demande de diagnostic » | Fait — contenus réécrits |
| Persistance Airtable | Adaptateur vérifié et corrigé · **schéma au §5, en attente de la base** |
| Profil sans présélection + ordre | Fait |
| Profil « en transition » sans comparatif | Fait |
| `/merci` et déduplication Meta | Supprimée · déduplication **vérifiée bout en bout** |
| Composants dupliqués | **Il n'y avait pas de duplication** — voir §6 |
| Resend : secret, adresses, domaine | Fait |

Tests : **115 → 140**. Recette navigateur : **42 contrôles, 0 échec**.
Typecheck, build et suite complète au vert.

**Rien n'est promu en production**, conformément au §2 : la branche est
poussée, le déploiement attend votre feu vert explicite.

---

## 1. Deux corrections à mon rapport précédent

Avant tout le reste, parce que deux points de ce brief en découlent
directement et qu'ils sont faux.

### 1.1 — Il n'y avait pas de duplication de composant

Mon §7.3 affirmait : « `HeroDiagnostic` et `FlashDiagnostic` sont deux copies
du même composant […] dans deux chartes graphiques différentes ». Les deux
fichiers existaient bien, mais **`HeroDiagnostic` n'était importé par aucun
fichier**. `app/page.tsx` rend `LandingC` — le même composant que `/lp/*` —
qui utilise `FlashDiagnostic`. L'accueil et les landings partageaient donc
**déjà** un seul composant de diagnostic.

J'avais constaté que les deux fichiers se ressemblaient sans vérifier lequel
était vivant. Le §5.2 du brief en a tiré une consigne d'unification
« paramétrée par son apparence » : l'appliquer aurait ajouté de l'indirection
pour zéro appelant. Les trois orphelins de l'ancienne home sombre
(`HeroDiagnostic`, `Scene3D`, `TransparencySection`) sont supprimés — c'est
ce qui écarte réellement le risque que le §5.2 visait, à savoir modifier le
mauvais fichier.

### 1.2 — La déduplication Meta n'était pas cassée

Mon §7.1 disait que la déduplication « ne s'exécute jamais ». La formulation
laissait croire à un problème vivant. En réalité je l'avais **rebranchée dans
cette même session** : `InscriptionStep` émet le Pixel `Lead` avec
`skipCapi: true` et le même `event_id` que `/api/lead` transmet à la CAPI.
Seule la copie sur `/merci`, page orpheline, était morte.

**Vérifié bout en bout cette fois**, et non plus par lecture du code : Pixel
et CAPI émettent `Lead` avec un `event_id` identique (§4 ci-dessous).

### 1.3 — Et une erreur de cette session

J'ai annoncé en début de session que `FlashDiagnostic` était « monté deux
fois sur chaque landing ». C'est faux : les deux points de montage de
`LandingC` sont **mutuellement exclusifs** (hero en variante « flash »,
section dédiée en variante « vsl »). Une seule instance est rendue à la fois.
Le store partagé reste justifié — c'est lui qui fait fonctionner le retour
arrière du §3.4 et la survie au rafraîchissement — mais pas pour la raison
que j'avais donnée.

---

## 2. Le relais du diagnostic (§3)

### 2.1 — Mécanisme retenu, et pourquoi

**Paramètre d'URL lisible sur le lien de sortie, plus le store persisté.**

Le CTA du diagnostic pointe vers
`/simulateur?from=diag&p=porte&t=500-650&q3=non`.

| Critère | URL lisible | Store seul | Jeton signé |
|---|---|---|---|
| Traçable en analytics | oui | non | non (opaque) |
| Partageable, débogable à l'œil | oui | non | non |
| Survit à un stockage indisponible | oui | **non** | oui |
| Poids et complexité | nul | nul | signature + compression |

Le point décisif est la troisième ligne. En navigation privée, ou après une
purge ITP de Safari, un relais porté uniquement par `localStorage` serait
perdu **en silence** : l'utilisateur ressaisirait sans que rien ne le
signale — exactement le mode de défaillance qui a produit BUG-06. Le jeton
signé, lui, résout un problème qui ne se pose pas : ces trois réponses ne sont
ni sensibles ni à protéger contre l'altération. Quelqu'un qui trafiquerait le
paramètre ne ferait que modifier sa propre simulation.

Le store persisté reste nécessaire pour deux choses que l'URL ne couvre pas :
le retour arrière depuis le simulateur doit retrouver le diagnostic prérempli
(§3.4), et un rafraîchissement ne doit pas effacer les réponses.

**Précédence à l'hydratation.** L'URL fait autorité quand elle porte un
relais (l'utilisateur vient de cliquer, son intention est explicite) ; sinon
l'état enregistré ; sinon un parcours vierge. L'URL de relais est ensuite
normalisée en `?step=activite` par un `replace` et non un `push`, pour que le
retour natif ramène à la landing plutôt que de rejouer le préremplissage.

**Dégradation.** Toute valeur inconnue est ignorée à la lecture, jamais
propagée. Sept formes de relais dégradé sont testées — segment inconnu,
fourchette inconnue, valeurs vides, injection, chaînes de 3 000 caractères —
et donnent toutes un parcours vierge sans exception ni écran cassé.

### 2.2 — L'effort conservé est rendu visible (§3.3)

C'est le point qui fait la conversion, et il était facile à manquer.

- **L'arrivée se fait directement sur Activité**, pas sur Profil. C'est
  l'avancement réel : une étape entière est économisée, ce n'est pas un
  affichage flatteur. La barre de progression le reflète mécaniquement.
- **Un bandeau** annonce « On reprend là où vous vous êtes arrêté », en
  nommant ce qui a été repris (profil, TJM, ou les deux).
- **Les champs repris sont marqués** et accompagnés du moyen de les corriger
  en un geste. Choisir soi-même lève la marque : le champ n'est plus hérité,
  il est assumé.

Préremplir n'est pas verrouiller : tout reste modifiable, et le calcul suit.

### 2.3 — Changement assumé : la sortie chiffrée du diagnostic

Le §3.1 demandait que la sortie reste « une fourchette de net, comme
aujourd'hui ». Ce n'était pas ce que faisait le code : il affichait une
fourchette de **« laissé sur la table »**.

Or, depuis la suppression de l'écrêtage en session précédente, cette valeur
**peut être négative** pour un micro-entrepreneur. Une landing annonçant
« vous laissez entre −5 200 et −4 400 € sur la table » n'était pas tenable.

La sortie est donc devenue une **fourchette de net perçu** : positive pour
tous les segments, calculée sur les bornes réelles de la fourchette choisie
(et non sur un ±15 % arbitraire), et volontairement conservatrice — 20 jours
facturés, sans avantages, sans frais professionnels. Le simulateur ne peut
donc que faire mieux, jamais contredire, ce qui est exactement la contrainte
que vous posiez.

C'est cohérent avec le cadrage du §0 : l'euro n'est pas le Aha, le vrai taux
de foyer l'est. Le bloc qui suit la fourchette l'annonce explicitement, et sa
formulation varie selon la 3ᵉ réponse.

---

## 3. Les arbitrages (§4)

### 3.1 — E3/E4 : « demande de diagnostic »

Renommés partout : fonctions, gabarits, sujets, route
(`/api/inscription` → `/api/demande-diagnostic`), clés d'idempotence.

**Ce qui a changé dans les contenus.** Ce n'est pas un simple renommage :
l'ancien texte parlait d'inscription et de « prochaines étapes » génériques.
Le nouveau correspond à l'acte réel — une demande de rendez-vous.

- **E3 (au lead)** : engagement de rappel **sous 24 h ouvrées**, au numéro
  fourni ; ce qui sera préparé avant l'appel (simulation revérifiée à la main,
  optimisations applicables, proposition ferme) ; durée de 30 minutes ; quoi
  avoir sous la main (dernier bulletin ou bilan, facultatif). Objet :
  « *prénom*, votre demande de diagnostic est reçue ».
- **E4 (à l'équipe)** : **téléphone en premier**, avant l'email — c'est le
  signal le plus chaud du tunnel et il se traite par un appel. Bandeau « à
  rappeler sous 24 h ouvrées ». Objet : `[Diagnostic] prénom — téléphone`.

Le délai de 24 h ouvrées est un engagement affiché au lead : **à valider par
Ridha**, c'est lui qui le tiendra.

Le trou que je signalais disparaît bien de lui-même : un lead qui s'inscrit
sans cliquer sur le CTA reçoit E1, l'équipe reçoit E2. Aucune étape
d'inscription distincte n'a été créée.

### 3.2 — Profil : plus de présélection, et l'ordre

`freelance_micro` était à la fois la valeur par défaut et le premier élément
de la liste : le chemin le plus fréquent menait au seul résultat qui dessert
le produit. Le profil est désormais un choix explicite.

J'ai fait porter la règle par le **type** (`CurrentStatus | null`) plutôt que
par un drapeau : le compilateur a fait remonter les six endroits qui
supposaient un profil toujours présent. Le profil manquant entre dans
l'invariant anti-zéro, avec son message et son étape de retour.

Ordre appliqué : porté ailleurs, freelance, salarié en ESN, en transition.

**« Impatrié » est conservé, en 5ᵉ position** — c'est ma décision, vous me
l'avez laissée. Votre tableau du §3.1 décrit la question du diagnostic flash,
qui pose bien quatre profils. Mais le régime art. 155 B est déjà câblé dans
le moteur IR : le sortir de l'étape Profil l'aurait rendu inatteignable alors
que c'est un vrai différenciateur. Le diagnostic pose donc quatre profils, le
simulateur en propose cinq, et un impatrié se sélectionne à l'étape Profil.

### 3.3 — « En transition » : pas de comparatif inventé

Ce profil n'a pas de situation actuelle — le scénario « actuel » y est une
projection en micro, pas un existant. L'écran de résultats, le dossier et les
emails présentent désormais **le portage seul** : net perçu, taux de foyer,
leviers. Aucun écart, aucun zéro.

La règle vit dans le contrat de données (`resultats.comparable`) et non dans
chaque écran : même principe que la mention « avantages inclus » — un
affichage dérivé du calcul ne peut pas diverger de lui.

### 3.4 — Message micro-entrepreneur : intact

Ni les formules ni le texte de contrepartie n'ont été touchés, comme demandé.
Il reste en attente de validation client.

---

## 4. Déduplication Meta — état vérifié

Chaîne complète, mesurée dans un navigateur avec un Pixel actif et le
consentement marketing accordé :

1. `InscriptionStep` génère un `event_id` et l'envoie à `/api/lead` ;
2. `/api/lead` le transmet à la CAPI serveur pour l'événement `Lead` ;
3. à la réponse, le navigateur émet le Pixel `Lead` avec **le même
   `event_id`** et `skipCapi: true`, pour ne pas envoyer la CAPI deux fois.

Contrôle automatisé : `pixel=5f038016-… · capi=5f038016-…` — identiques.
La déduplication est donc opérationnelle, et le prérequis Meta est levé.

`/merci` est supprimée (aucun lien n'y menait ; sa logique faisait doublon).
`docs/landing-conversion.md` et le README sont mis à jour.

---

## 5. Schéma Airtable attendu — à créer

Ce qu'il vous faut poser pour `CRM_PROVIDER=airtable`. **L'adaptateur
existant est complet et fonctionnel** pour le chemin d'écriture (création,
mise à jour, événements, déclenchement de séquence) ; je n'y ai corrigé qu'un
défaut, décrit plus bas.

### Table `Leads`

| Champ | Type Airtable | Notes |
|---|---|---|
| `lead_id` | Single line text | UUID, clé de rapprochement |
| `created_at` | Single line text | ISO 8601 — **texte, pas Date**, pour conserver l'horodatage exact |
| `prenom` | Single line text | |
| `email` | Email | |
| `telephone` | Phone number | peut être vide |
| `statut_actuel` | Single select | `salarie_esn`, `freelance_micro`, `freelance_sasu`, `porte_ailleurs`, `transition` |
| `tjm_ou_ca` | Number (entier) | |
| `jours_factures` | Number (entier) | jours **par an** |
| `economie_annuelle_eur` | Number (entier) | **doit accepter les valeurs négatives** — voir ci-dessous |
| `funnel_stage` | Single select | `interet`, `consideration`, `decision`, `signe`, `perdu` |
| `lead_source` | Single line text | |
| `device` | Single line text | |
| `consentement_marketing` | Checkbox | |
| `consent_timestamp` | Single line text | ISO 8601 |
| `policy_version` | Single line text | |
| `sequence_a_declencher` | Single line text | écrit par l'adaptateur, lu par votre automation |
| `raw_json` | Long text | payload canonique complet, pour l'audit et une migration future |

> **Point de vigilance sur `economie_annuelle_eur`.** Depuis la suppression de
> l'écrêtage (BUG-02), cette valeur **peut être négative**. Si le champ est
> créé en « Currency » avec un format qui refuse le négatif, ou avec une
> validation de positivité, les leads micro-entrepreneurs seront rejetés à
> l'écriture. Un champ **Number** classique convient. J'ai vérifié que le
> schéma de validation côté serveur accepte bien le négatif.

### Table `Events`

| Champ | Type Airtable | Notes |
|---|---|---|
| `lead_id` | Single line text | rapprochement avec `Leads` |
| `event` | Single line text | nom d'événement du tunnel |
| `timestamp` | Single line text | ISO 8601 |
| `metadata` | Long text | JSON sérialisé |

### Variables d'environnement

```
CRM_PROVIDER=airtable
AIRTABLE_API_KEY=pat...        # token personnel, scopes data.records:read + data.records:write
AIRTABLE_BASE_ID=app...
# facultatif si vos tables portent d'autres noms :
# AIRTABLE_LEADS_TABLE=Leads
# AIRTABLE_EVENTS_TABLE=Events
```

Airtable ne sait pas envoyer la séquence 14 jours : l'adaptateur marque le
lead (`sequence_a_declencher=seq14`) et une automation Make/Zapier ou un sync
Airtable→Brevo doit se brancher sur ce champ.

### Ce que j'ai corrigé dans l'adaptateur

`exportCSV` ne lisait qu'**une page de 100 enregistrements**, sans suivre le
curseur `offset` d'Airtable. Au-delà du centième lead, l'export de Linda
tronquait **en silence**. La pagination est désormais suivie, avec un
garde-fou à 10 000 lignes et un log explicite si elle devait s'emballer. Une
troncature invisible dans son fichier est pire qu'une erreur visible.

### Le mode `mock` devient bruyant

En production, `CRM_PROVIDER=mock` journalise désormais une **erreur**
explicite nommant le remède, et les emails internes portent un bandeau
`[ALERTE]` avec les **données brutes du lead**, pour qu'il reste récupérable
à la main. Un échec d'écriture CRM produit la même alerte. Le parcours
utilisateur n'est jamais interrompu — mais il n'est plus possible de perdre
un lead sans que personne ne le voie.

---

## 6. Resend (§6)

1. **`MAIL_FROM` ≠ `MAIL_INTERNAL_TO`** — la collision est détectée et
   journalisée. `.env.example` documente la configuration recommandée :
   expédier depuis `simulateur@rdportage.com`, recevoir les copies sur
   `marketing@rdportage.com`.
2. **`DOSSIER_SECRET` est bloquant en production** — et non plus un
   avertissement. Sans lui, un secret de développement connu prenait le
   relais : n'importe qui aurait pu forger un lien affichant des montants
   arbitraires sous votre marque. La vérification est ignorée pendant
   `next build`, où les variables de production ne sont pas nécessairement
   présentes ; elle s'applique à l'exécution.
3. **Domaine non vérifié** — Resend refuse l'expéditeur tant que le DNS n'est
   pas posé. C'est une erreur de **configuration**, pas un incident : elle
   n'est plus réessayée comme transitoire (trois échecs identiques masquaient
   la cause), elle est nommée pour ce qu'elle est, et le log donne le remède
   ainsi que l'expéditeur refusé.

Les enregistrements DNS restent ceux du §4 de `rapport-maintenance.md`.
Rappel : la valeur DKIM (`p=…`) est générée par Resend et doit être recopiée
depuis leur tableau de bord.

---

## 7. Ce qui reste ouvert

1. **La base Airtable n'existe pas encore.** Le schéma est au §5. Tant qu'elle
   n'est pas créée et les clés posées, la production reste en `mock` — donc
   sans aucune persistance. **C'est le dernier verrou avant d'ouvrir le
   robinet publicitaire.**
2. **Le délai de rappel « sous 24 h ouvrées »**, affiché au lead dans E3, est
   un engagement que je n'ai pas le pouvoir de prendre. À confirmer ou à
   modifier.
3. **Le message micro-entrepreneur** reste en attente de validation client.
4. **Aucun envoi Resend réel** n'a encore eu lieu ; aucune clé n'était
   disponible dans cette session.
5. **Safari iOS réel** : toujours pas vérifié (WebKit indisponible dans cet
   environnement). La recette mobile tourne en émulation iPhone sur Chromium.
6. **Les deux chartes graphiques coexistent toujours** — voir §8.
7. `pdf_downloaded` reste dans les événements de tunnel, **déprécié**,
   conservé pour ne pas invalider l'historique des leads déjà journalisés.
   Remplacé par `dossier_opened`. Aucune action.

---

## 8. Correctifs à l'annexe responsive du rapport précédent

L'annexe sert de base à la session responsive : voici ce qui a changé.

**Ce qui n'est plus valable :**

- La ligne `/merci` du tableau des routes : **la page est supprimée**.
- Le constat « HeroDiagnostic et FlashDiagnostic, deux chartes » : il ne
  restait qu'un composant vivant, et les orphelins sont supprimés. **Le
  diagnostic n'a plus qu'un seul rendu.**

**Ce qui reste valable, et inchangé :**

- **Les deux systèmes de design coexistent toujours.** La palette verrouillée
  de `tailwind.config.ts` (`nuit`, `laiton`, `creme`, `encre`) reste utilisée
  par `/mentions-legales`, `/confidentialite` et les pages `/concept-*` via
  `components/landing/sections.tsx` (`SiteFooter`, toujours importé par
  quatre pages), tandis que `/`, `/lp/*`, `/simulateur` et `/dossier` emploient
  les hexadécimaux « fintech clair » en dur. **L'arbitrage reste entier** et
  appartient à la session responsive.
- Breakpoints : toujours `sm:` et `md:` uniquement, aucun `lg:`/`xl:`.
- Aucun débordement horizontal, sur aucune route, à aucune largeur.
- Aucun champ de saisie sous 16 px, aucun `<input type="number">`.

**Cibles tactiles — mesure actualisée sur `/lp/a` :**

| Élément | Taille | État |
|---|---|---|
| `a` « Calculer mon vrai taux » (corps de landing) | 190 × 40 | **inchangé — reste le point prioritaire** |
| `a` « Mentions légales » | 90 × 14 | inchangé |
| `a` « Confidentialité » | 76 × 14 | inchangé |

Le CTA **du diagnostic** est désormais à 48 px (318 × 48 en mobile) : c'est
un autre lien que celui listé ci-dessus, qui subsiste dans le corps de la
landing. Le bouton « Recommencer le diagnostic » que j'ai introduit dans cette
session est à 44 px — corrigé avant livraison, pour ne pas ajouter à la liste.

---

## 9. Vérification

- **Typecheck, build, 140 tests** : au vert.
- **Recette navigateur : 42 contrôles, 0 échec** — relais depuis les 7
  variantes de landing, modification après relais, arrivée directe sans
  profil, 4 formes de relais dégradé, retour arrière prérempli, survie au
  rechargement, profil « en transition » sans comparatif, déduplication
  Pixel/CAPI, et mobile.
- **Rien n'est promu en production.** La branche est poussée ; le déploiement
  attend votre feu vert.
