# API Conversions Meta (CAPI) — note de préparation

**Statut : préparée, NON activée.** Aucun événement serveur ne part tant que
`META_CAPI_ENABLED` ne vaut pas exactement `true` et que `META_CAPI_TOKEN`
n'est pas défini.

## Ce qui existe

- `lib/server/capi.ts` — `sendCapiEvent()` :
  - no-op tant que la CAPI n'est pas activée ;
  - mêmes garde-fous que le Pixel (`lib/tracking/meta-rules.ts`) : événements
    en liste blanche, paramètres filtrés (`content_name` / `step` / `from`),
    `event_source_url` écartée si la page est exclue ou porte un paramètre inconnu ;
  - token envoyé dans le corps de la requête, pas dans l'URL (il n'apparaît pas
    dans les journaux d'accès) ;
  - aucun e-mail ni téléphone envoyé. Les fonctions de hachage SHA-256
    (`hashEmail`, `hashPhone`) sont conservées et testées, pour une décision
    ultérieure sur la correspondance avancée.
- `app/api/lead/route.ts` : point d'envoi de `Lead`, juste après
  l'enregistrement du lead, avec le **même `event_id`** que le Pixel
  (`meta_event_id` envoyé par le navigateur).
  - L'envoi est conditionné à `ad_consent === true`, c'est-à-dire le
    consentement publicitaire de la bannière, **et non** la case d'opt-in e-mail.
  - Données jointes : `fbp`/`fbc` (cookies posés par le Pixel, donc seulement
    après consentement), IP et user-agent.
- L'ancien relais navigateur → `/api/capi`, qui recopiait chaque événement du
  navigateur, a été supprimé. Il n'existe plus de route publique pour
  injecter des événements.

## Où brancher `Schedule`

`Schedule` doit partir quand le rendez-vous est **confirmé**, pas au clic. Le
plus fiable est côté serveur, sur le webhook de l'outil de RDV :
- Calendly : `invitee.created` ;
- Cal.com : `BOOKING_CREATED`.

Une route `app/api/rdv-webhook/route.ts` vérifierait la signature du webhook,
puis appellerait `sendCapiEvent({ eventName: "Schedule", eventId, … })`.
L'`event_id` partagé avec le Pixel doit voyager dans l'outil de RDV : paramètre
caché (`utm_content` ou champ personnalisé) renseigné à l'ouverture de l'embed,
avec ce même id utilisé dans le `fbq('track','Schedule', {}, {eventID})` déclenché
par l'événement de confirmation de l'embed.

## Activation (plus tard)

1. Gestionnaire d'événements > « RD Portage - Pixel simulateur » > Paramètres >
   API Conversions > **Générer un token d'accès**.
2. Vercel > Settings > Environment Variables (Preview d'abord), **jamais dans le dépôt** :
   - `META_CAPI_TOKEN=<token>`
   - `META_CAPI_ENABLED=true`
   - pour tester : `META_CAPI_TEST_EVENT_CODE=TESTxxxx` (onglet « Tester les événements »).
3. Faire un parcours avec consentement, puis vérifier dans « Tester les
   événements » que le `Lead` arrive **une fois** et qu'il est dédoublonné :
   même `event_id` côté navigateur et côté serveur.
4. Retirer `META_CAPI_TEST_EVENT_CODE` avant la production.
5. Mettre à jour la politique de confidentialité : envoi serveur à Meta, mêmes
   données que le Pixel, en plus de l'IP et du navigateur transmis par le serveur.
