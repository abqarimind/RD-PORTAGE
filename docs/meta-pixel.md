# Pixel Meta — simulateur.rdportage.com

- **Pixel (jeu de données)** : `4019768748330072`, « RD Portage - Pixel simulateur »
- **Compte publicitaire** : 2868107600203968
- **Événement d'optimisation** : `Lead` (« Prospect » dans le Gestionnaire de publicités)

## Architecture

| Fichier | Rôle |
|---|---|
| `lib/tracking/meta.ts` | Module unique : chargement du Pixel, consentement, `track()`, `event_id`, dédoublonnage |
| `lib/tracking/meta-rules.ts` | Règles pures (testées) : événements autorisés, liste blanche de paramètres, pages exclues, URL sûres |
| `lib/tracking/consent.ts` | Cookie `rdp_consent` (`granted` / `denied`, 180 jours) + événements de changement |
| `components/ConsentBanner.tsx` | Bannière Accepter / Refuser / Personnaliser + lien « Gérer les cookies » (pied de page) |
| `components/MetaRouteTracker.tsx` | Un PageView par changement de route (App Router) |
| `lib/diagnostic/relay.ts` | Relais diagnostic → simulateur sans URL (mémoire + localStorage) |
| `lib/tracking/utm.ts` | UTM + fbclid en sessionStorage, envoyés au CRM avec le lead |

### Activation

- Actif quand `NODE_ENV=production` (production **et** Preview Vercel).
- En local : inactif (aucun script, aucune bannière), sauf `NEXT_PUBLIC_META_PIXEL_DEBUG=true`.
- `NEXT_PUBLIC_META_PIXEL_ID` surcharge l'ID par défaut ; `off` coupe le Pixel partout.

## Consentement (CNIL)

1. Avant tout choix : **aucun script Meta n'est téléchargé**, aucun cookie `_fbp`/`_fbc`.
2. Le seul événement conservé en attente est le **PageView de la page en
   cours**. Tout autre événement survenu avant le consentement est abandonné,
   jamais rejoué (pas de `Lead` a posteriori).
3. À l'acceptation : `fbq('consent','revoke')` → `fbq('set','autoConfig',false)` →
   `fbq('init', …)` → chargement de `fbevents.js` → `fbq('consent','grant')` →
   PageView en attente. (Le `grant` est envoyé après le chargement du
   script : mis en file avant, il reste bloqué derrière le `revoke`.)
4. Retrait (« Gérer les cookies » → Tout refuser) : `fbq('consent','revoke')`,
   suppression de `_fbp` / `_fbc`. Au rechargement suivant, le script n'est plus chargé.
5. Pas de `<noscript>` : l'image partirait sans consentement.
6. `autoConfig` désactivé (pas de collecte automatique des clics ni des
   métadonnées de page), `disablePushState` activé (pas de PageView automatique
   sur les changements d'historique : un seul PageView par route, le nôtre).

## Plan de marquage

| Moment | Appel | Dédoublonnage |
|---|---|---|
| Chaque route (hors pages exclues) | `track PageView` | un par changement de chemin (`?step=` ne compte pas) |
| Landing `/` et `/lp/<angle>` | `track ViewContent {content_name: 'lp_<angle>'}` | une fois par affichage de page |
| 1re réponse du diagnostic flash | `trackCustom DiagnosticFlashStart {step: 'flash'}` | une fois par session |
| Fourchette du diagnostic affichée | `trackCustom DiagnosticFlashComplete` (sans paramètre) | une fois par session |
| Résultat du simulateur foyer affiché | `trackCustom SimulateurFoyerComplete` (sans paramètre) | une fois par simulation |
| Formulaire « Recevoir mon dossier » : réponse **200** de `/api/lead` | `track Lead {content_name: 'simulateur_dossier'}` | un par envoi (`event_id` = celui transmis à `/api/lead`) |
| Clic `tel:`, `mailto:`, WhatsApp, « Nous contacter » | `track Contact {from: '<emplacement>'}` | un par clic |
| RDV « diagnostic 30 min » confirmé | `track Schedule` | **non implémenté**, voir ci-dessous |

Chaque appel porte `{eventID: <uuid>}` (déduplication future avec la CAPI).

Valeurs de `from` : `lp_pricing_tel`, `lp_vsl_hero_tel`, `sim_result_tel`,
`sim_unlocked_tel`, `contact_options_tel`, `contact_options_email`,
`contact_options_whatsapp`.

`SimulateurStart` n'est plus envoyé à Meta. Le démarrage du simulateur reste
mesuré dans Plausible (`sim_started`, depuis le diagnostic ou l'étape Profil).

### Schedule — pourquoi rien n'est envoyé

Aucun outil de rendez-vous n'est intégré : `NEXT_PUBLIC_RDV_URL` est vide et
le bouton « Nous contacter » appelle la ligne de l'équipe (`tel:`). Un lien
Calendly ou Cal.com ouvert dans un nouvel onglet ne permet pas de savoir si
le rendez-vous est **confirmé** : envoyer `Schedule` au clic fausserait
l'optimisation. L'ancien `Schedule` au clic a donc été retiré.
À brancher quand un embed sera intégré à la page :
Calendly (`message`, `e.data.event === 'calendly.event_scheduled'`, origine
`https://calendly.com`) ou Cal.com embed (`bookingSuccessful`).

## Données interdites : garde-fous

- **Paramètres** : liste blanche `content_name`, `step`, `from`, dont la valeur
  doit être un identifiant technique (`[a-z0-9_-]`, au moins une lettre ou un
  `_`). Un montant, une fourchette (`350-500`), un e-mail ou un texte libre est
  supprimé, même sous une clé autorisée (`meta-rules.ts`, testé).
- **URL** : aucun chargement du Pixel ni aucun envoi si la page est exclue
  (`/dossier`, `/confidentialite`, `/mentions-legales`) ou si l'URL porte un
  paramètre hors liste blanche (UTM, `fbclid`, `gclid`, `step`, `v`, `nav`).
- **Relais diagnostic → simulateur** : il ne passe plus par
  `?from=diag&p=…&t=…&q3=…` (la tranche de TJM serait partie dans l'URL). Il
  passe désormais par la mémoire du module et localStorage. Un ancien lien
  de relais est nettoyé par le simulateur, et aucun événement ne part tant que
  l'URL n'est pas propre.
- **Dossier** : `/dossier?d=…` porte le récapitulatif dans l'URL, d'où pas de
  Pixel et `referrer: origin`, pour que l'URL ne fuite pas en referrer.
- **Pas de correspondance avancée** : ni e-mail ni téléphone, même hachés.
- Les anciens appels qui envoyaient la fourchette de net (`low`/`high`) et
  `value = economie_annuelle_eur` (Lead CAPI) ont été supprimés.

## Vérification

### Ce qui a été vérifié avant commit

Build de production (`next build && next start`) puis Chromium (Playwright).
`fbevents.js` est remplacé par un enregistreur des appels `fbq`, avec l'URL
de la page à chaque appel. Rien n'a été envoyé au vrai Pixel. Le même
parcours a été rejoué en `next dev` (StrictMode) avec `NEXT_PUBLIC_META_PIXEL_DEBUG=true`.

- Arrivée `/lp/b?utm_source=facebook&fbclid=…` : aucune requête Meta, bannière visible.
- 1re réponse au diagnostic avant consentement : rien n'est envoyé, l'événement est abandonné.
- Accepter : chargement de `fbevents.js`, puis `PageView` (page en cours) uniquement.
- Fin du diagnostic : `DiagnosticFlashComplete` une fois, `{}`.
- Clic vers le simulateur : `PageView` sur `/simulateur`, URL sans aucune réponse du diagnostic, simulateur prérempli (étape Activité).
- Résultat : `SimulateurFoyerComplete` une fois ; retour arrière puis avant : rien.
- Clic `tel:` : `Contact {from: 'sim_result_tel'}`.
- Formulaire (double-clic) : un seul `/api/lead` → 200 → un seul `Lead {content_name: 'simulateur_dossier'}` ; `ad_consent: true` et UTM + fbclid présents dans le payload.
- `/dossier`, `/confidentialite`, `/mentions-legales` : script Meta non chargé, aucun appel.
- Ancien lien `/simulateur?from=diag&p=porte&t=350-500` : URL nettoyée, aucun appel `fbq` tant qu'elle contenait `t=`.
- Retrait du consentement : `consent revoke`, puis plus aucun événement ; au rechargement, plus de script.
- Paramètres de tous les appels : uniquement `content_name` / `step` / `from`.

Limite : dans ce Chromium headless, même le snippet officiel seul n'émet
aucune requête `facebook.com/tr` (le script et la config du Pixel se chargent,
mais rien n'est émis). La vérification porte donc sur les appels `fbq`. Le
contrôle final des requêtes réelles se fait avec les outils Meta ci-dessous.

### À faire en Preview (avant la production)

1. Déployer la branche en **Preview Vercel** (le Pixel y est actif, `NODE_ENV=production`).
2. Extension Chrome **Meta Pixel Helper** :
   - avant de cliquer sur la bannière, l'extension ne doit rien détecter ;
   - après « Accepter » : `PageView`, puis les événements du tableau, chacun une seule fois.
3. **Gestionnaire d'événements** > « RD Portage - Pixel simulateur » > **Tester
   les événements** > saisir l'URL de la Preview > « Ouvrir le site Web ».
   Faire le parcours complet ; vérifier dans chaque événement reçu :
   - l'URL (`dl`) ne contient ni `d=`, ni `t=`, ni montant ;
   - les paramètres sont limités à `content_name` / `step` / `from`.
4. Onglet Réseau de Chrome, filtre `facebook.com/tr` : inspecter `ev`, `dl`, `rl`, `cd[…]`.
5. Le `test_event_code` ne concerne que la CAPI (`META_CAPI_TEST_EVENT_CODE`), qui n'est pas active.

## Politique de confidentialité — ce qu'il faut ajouter

À valider par la personne en charge du juridique avant la mise en production :

1. **Section « Cookies et traceurs »** avec le tableau :
   - `rdp_consent` : mémorise votre choix, 6 mois, strictement nécessaire (exempté de consentement) ;
   - `_fbp` et `_fbc` (Meta) : mesure des campagnes publicitaires, 90 jours,
     **déposés uniquement après votre accord** ;
   - stockage de session `rdp_first_touch`, `rdp_last_touch`, `rdp_fbclid` :
     origine de la visite (paramètres UTM, identifiant de clic Meta), effacé
     à la fermeture de l'onglet ;
   - stockage local des réponses du diagnostic et de la simulation : nécessaire
     au service demandé, 7 jours pour le diagnostic.
2. **Données transmises à Meta, après consentement seulement** : adresse de la
   page visitée, événements de parcours (liste ci-dessus), identifiant
   d'événement, cookies `_fbp`/`_fbc`, adresse IP et navigateur (transmis par
   votre appareil). Mentionner explicitement qu'**aucune donnée de simulation**
   (revenus, TJM, impôt, situation familiale…), ni e-mail, ni téléphone n'est
   transmise à Meta.
3. **Base légale** : votre consentement, retirable à tout moment via le lien
   « Gérer les cookies » en bas de chaque page, aussi simplement qu'il a été donné.
4. **Co-responsabilité** : pour la collecte et la transmission des données par
   le Pixel, RD Portage et Meta Platforms Ireland Ltd sont responsables
   conjoints (CJUE, *Fashion ID*, 2019) ; lien vers la politique de Meta et
   vers l'addendum « Responsable conjoint du traitement » des Conditions Meta Business Tools.
5. **Attribution des campagnes dans le CRM** : les paramètres UTM et le
   `fbclid` sont enregistrés avec votre demande, avec la même durée de conservation que le lead (3 ans).
6. **Transfert hors UE** : déjà mentionné (Meta Platforms, EU-US Data Privacy
   Framework) ; préciser l'entité (Meta Platforms Ireland Ltd → Meta Platforms, Inc.).
7. Mettre à jour `POLICY_VERSION` (`config/contact.ts`) à la publication.

Point à arbitrer : la CNIL considère aussi sessionStorage comme un traceur.
L'attribution des campagnes dans le CRM n'entre pas clairement dans les
exemptions (mesure d'audience strictement nécessaire). Le risque est faible
(premier niveau, effacé à la fermeture de l'onglet, jamais transmis à un
tiers), mais il est à valider par le juridique.
