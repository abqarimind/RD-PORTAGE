# Mesure d'audience sans cookie (Plausible)

Objectif : savoir combien de personnes arrivent vraiment depuis les pubs et
où elles abandonnent, **que la bannière cookies soit acceptée ou non**. Le
Pixel Meta ne voit que les personnes qui acceptent ; Plausible voit tout le
monde, sans rien déposer sur l'appareil.

## Branchement

| Élément | Où |
|---|---|
| Script du site (`pa-Um3XuVPoX76PZHXQpHXCw.js`) | `lib/tracking/analytics.ts` (surcharge : `NEXT_PUBLIC_PLAUSIBLE_SCRIPT`) |
| Chargement + `plausible.init({ transformRequest })` | `app/layout.tsx` |
| Objectifs et propriétés autorisés | `lib/tracking/analytics-rules.ts` (testé) |
| Envoi des objectifs | `trackGoal()` / `trackContact()` dans `lib/tracking/analytics.ts`, appelés par `trackEvent()` |
| Opposition (« Ne pas être compté ») | `components/AnalyticsOptOut.tsx`, sur `/confidentialite` |

Actif sur le déploiement de **production** uniquement (`VERCEL_ENV`), ou
partout avec `NEXT_PUBLIC_PLAUSIBLE_DEBUG=true`. Les Preview ne comptent pas.

## Pourquoi le script ne chargeait pas avant le 14/10

Le code n'ajoutait le script que si `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` était
défini ; cette variable n'a jamais été posée dans Vercel. Le code utilisait
en outre l'ancien script (`script.js` + `data-domain`), pas le script propre
au site fourni par Plausible.

## Objectifs (à déclarer dans Plausible → Site settings → Goals → Custom event)

| Objectif | Moment |
|---|---|
| `diag_started` | première réponse du diagnostic |
| `diag_completed` | réponse à la 3ᵉ question (fourchette affichée) |
| `sim_started` | entrée dans le simulateur |
| `sim_completed` | « Voir mon résultat » |
| `lead_submitted` | réponse **réussie** du serveur au formulaire |
| `contact_click` | clic tel:, mailto:, WhatsApp, « Nous contacter » |

Propriétés (Site settings → Custom properties) : `angle` (ex. `lp_b`) et
`utm_content` (nom de l'annonce). Rien d'autre ne part : la liste est fermée
et les valeurs doivent être des identifiants techniques.

Les pages vues partent automatiquement (y compris les changements de page
sans rechargement). Avant chaque envoi, `transformRequest` réduit l'URL au
chemin et aux UTM ; `/dossier` part sans aucun paramètre (son lien porte le
récapitulatif de la personne).

## Exemption de consentement (pour la politique de confidentialité)

Conditions de la CNIL pour une mesure d'audience exemptée, et leur état ici :

- finalité strictement limitée à la mesure d'audience du site, pour son
  seul éditeur : **oui**, statistiques agrégées seulement ;
- aucun recoupement avec d'autres traitements, aucune transmission à des
  tiers : **oui**, ni Meta ni le CRM ne reçoivent ces données ;
- pas de suivi d'un site à l'autre, pas d'identifiant persistant : **oui**,
  aucun cookie ni stockage sur l'appareil côté Plausible ;
- aucune donnée de la simulation ni donnée personnelle dans les événements :
  **oui**, vérifié par `e2e/tracking.spec.ts` ;
- information et droit d'opposition : **oui**, section « Mesure d'audience »
  de `/confidentialite` avec le bouton « Ne pas être compté ».

`TODO(juridique)` : faire confirmer l'exemption et la durée de conservation
des statistiques côté Plausible (voir la politique de confidentialité).
