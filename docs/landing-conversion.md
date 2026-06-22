# Landing conversion `/lp` — système d'acquisition Meta

Landings optimisées conversion pour le trafic payant **founder-led Meta**
(Facebook/Instagram) → **landing** → **simulateur fiscal IR foyer** →
**lead (CRM Brevo)** → call Diagnostic 30 min. Dérivées de `/concept-c`
(design fintech clair + « fil doré »), rebâties mobile-first et instrumentées.

Tout fonctionne en **mode mock sans clé** : sans `NEXT_PUBLIC_META_PIXEL_ID`,
aucun event Meta n'est envoyé et aucune bannière de consentement ne s'affiche.

## Routes

| Route | Rôle |
|---|---|
| `/lp/a` | Hero **Angle A — Warning** (« Depuis 2024… c'est toi ») |
| `/lp/b` | Hero **Angle B — Vrai net** (défaut, = concept-c) |
| `/lp/c` | Hero **Angle C — Fondateur** (Ridha, ex-porté) |
| `/lp/<x>?nav=1` | Aperçu interne **avec** navigation (sinon masquée — trafic payant) |
| `/simulateur` | Simulateur IR foyer complet + capture lead (existant) |
| `/merci` | Confirmation post-soumission — déclenche le Pixel `Lead` |

Même corps de page ; **seul le bloc above-the-fold (hero) change** selon
l'angle (message match pub → page). Un angle inconnu retombe sur `b`.
Pages en `noindex` (destinations d'annonces).

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | Pixel navigateur (public). Active aussi la bannière de consentement. |
| `META_CAPI_ACCESS_TOKEN` | Token Conversions API (**secret serveur**). |
| `META_PIXEL_ID` | Facultatif : surcharge serveur du Pixel ID. |
| `META_GRAPH_VERSION` | Facultatif : version Graph API (défaut `v19.0`). |
| `META_CAPI_TEST_EVENT_CODE` | Facultatif : code « Test des événements » (Events Manager). |
| `NEXT_PUBLIC_RDV_URL` | Lien de prise de RDV (Calendly). Sinon appel direct Ridha. |

Voir aussi `.env.example`. La CAPI peut être activée **soit** par cette route
serveur (`/api/capi`), **soit** en 1-clic dans Events Manager — les deux sont
compatibles tant que l'`event_id` est partagé (ce que fait ce code).

## Convention UTM

Détail complet : `docs/convention-utm.md`. À l'arrivée on capte et **persiste**
(cookie + localStorage) `utm_source/medium/campaign/term/content` + `fbclid`,
injectés ensuite dans le payload du lead (→ CRM) et dans les events de tracking.

Exemple : `/lp/a?utm_source=facebook&utm_medium=paid_social&utm_campaign=rd-leads-test&utm_content=angleA-hook1-video`

## Events Meta (Pixel + CAPI, dédupliqués)

Chaque event est tiré **sur le Pixel navigateur ET la CAPI serveur** avec le
**même `event_name` + `event_id`** (sinon double comptage). PII (email,
téléphone) **hashée SHA-256 côté serveur** ; `fbp`/`fbc` + IP + user-agent
joints pour la qualité de matching. Rien ne part avant le **consentement
cookies** (RGPD).

| Event Meta | Type | Déclencheur |
|---|---|---|
| `PageView` | standard | chaque chargement / navigation (`MetaRouteTracker`) |
| `ViewContent` | standard | montage d'une landing `/lp/<angle>` (`content_name=lp_<angle>`) |
| `DiagnosticStart` | custom | 1ʳᵉ réponse du diagnostic flash |
| `DiagnosticComplete` | custom | 3ᵉ réponse — fourchette affichée |
| `SimulateurStart` | custom | montage du simulateur complet |
| `SimulateurComplete` | custom | passage à l'écran résultat |
| `Lead` | standard | **après validation backend** (`/api/lead`) — CAPI serveur + Pixel navigateur, `event_id` partagé |
| `Contact` | standard | clic « Appeler Ridha » (lien `tel:`) |
| `Schedule` | standard | clic prise de RDV quand `NEXT_PUBLIC_RDV_URL` est défini |

### Déduplication `Lead`

1. Le navigateur génère **un** `event_id` au moment de la soumission.
2. Il est envoyé à `/api/lead` (`meta_event_id`) → la **CAPI serveur** émet
   `Lead` avec cet id (email/téléphone hashés, `fbp`/`fbc` depuis les cookies).
3. À la réussite, le **Pixel navigateur** émet `Lead` avec le **même** id.
4. Meta fusionne les deux via `event_name` + `event_id`.

## Funnel interne (inchangé)

Les events internes (`diag_started`, `sim_completed`, `lead_submitted`, …)
continuent d'alimenter Plausible et le journal CRM (`lib/crm/schema.ts`),
indépendamment de Meta. Voir `docs/schema-lead.md`.

## Garde-fous honnêteté

- Témoignages, logos partenaires, chiffres non validés = placeholders marqués
  `// TODO: DONNÉE RÉELLE — en attente Ridha`, jamais de faux contenu en dur.
- Aucune fausse urgence / rareté / compteur.
- Mention « simulation à valeur indicative — ne constitue pas un conseil
  fiscal » conservée. La formulation Angle A (« depuis 2024 / c'est toi »)
  porte un `TODO: VALIDATION JURIDIQUE` (cf. `content/claims.ts`).

## Hors périmètre (en attente de Ridha)

Vrais témoignages · chiffres validés juridiquement · comparatif nominatif ·
logo final · droits logos partenaires · paramètres exacts du simulateur.
