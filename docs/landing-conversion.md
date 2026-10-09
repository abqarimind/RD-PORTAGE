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
| `/dossier` | Dossier du lead (artefact visuel) — lien signé envoyé par email |

Même corps de page ; **seul le bloc above-the-fold (hero) change** selon
l'angle (message match pub → page). Un angle inconnu retombe sur `b`.
Pages en `noindex` (destinations d'annonces).

## Variables d'environnement, convention UTM, événements Meta

- Pixel Meta, consentement, plan de marquage et procédure de test :
  **`docs/meta-pixel.md`**.
- API Conversions (préparée, non activée) : **`docs/meta-capi.md`**.
- UTM : `docs/convention-utm.md` (capture en sessionStorage, injectée dans le
  payload du lead → CRM, jamais transmise à Meta).
- `NEXT_PUBLIC_RDV_URL` : lien de prise de RDV. Sinon appel direct de la ligne
  de l'équipe (`config/contact.ts`).

Exemple : `/lp/a?utm_source=facebook&utm_medium=paid_social&utm_campaign=rd-leads-test&utm_content=angleA-hook1-video`

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
