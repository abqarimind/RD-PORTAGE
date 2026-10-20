# Funnel de conversion RD Portage

Tunnel complet : landing de capture (diagnostic flash 3 questions),
simulateur fiscal IR foyer (`/simulateur`), capture lead → CRM découplé,
séquence email 14 jours, tracking par actes (Intérêt / Considération /
Décision).

## Démarrer

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # moteur fiscal (16 cas calculés à la main)
npm run build      # build production (cible Vercel)
npm run test:e2e   # garde-fou du tracking, parcours complet sur iPhone (Playwright)
npm run report:weekly  # rapport KPI Markdown
```

## Arborescence

| Dossier | Contenu |
|---|---|
| `app/` | Next.js App Router : accueil (`components/landing/`), variantes par pub `/v/[variant]` (choisies par `middleware.ts`), `/simulateur`, `/dossier`, API routes lead/event/export/demande-diagnostic |
| `config/headlines.ts` | Titres d'accueil validés, un par annonce Meta (`utm_content`) |
| `components/lead/` | Formulaire de rappel (téléphone obligatoire), sur la fourchette et sur le résultat |
| `config/fiscal-2026.ts` | **Source unique** des taux/barèmes fiscaux & sociaux, datés + sourcés (spec simulateur §4) |
| `lib/fiscal/` | Moteur A (portage) + Moteur B (IR foyer) + 3 scénarios, tests Vitest, `AUDIT.md` |
| `lib/crm/` | `lead_schema_v1` (Zod), interface CRMAdapter, Resend (en production), Brevo/Airtable + stubs, file + journal NDJSON |
| `lib/tracking/` | UTM first/last touch + fbclid (sessionStorage), mesure sans cookie Plausible (`docs/mesure-sans-cookie.md`), Pixel Meta + consentement CNIL (`docs/meta-pixel.md`) |
| `e2e/` | Test de bout en bout du tracking (Meta, Plausible, payload `/api/lead`), lancé en CI |
| `lib/server/capi.ts` | Conversions API serveur — préparée, **non activée** (`docs/meta-capi.md`) |
| `content/claims.ts` | Tous les chiffres Atarhib/Targhib avec source obligatoire |
| `content/emails/` | Séquence prospects J3→J14 (4 envois en texte simple, 5 variantes à J10) — voir `content/emails/sequence.md` |
| `docs/` | Convention UTM, schéma lead, branchement CRM, **landing-conversion.md** (système ads Meta), etc. |

## Variables d'environnement

Copier `.env.example` → `.env.local`. Par défaut tout fonctionne en mode
mock (aucune clé requise) : les leads vont dans `data/leads-fallback.ndjson`.

## Héberger hors Vercel

Aujourd'hui, le site tourne sur Vercel : chaque fusion dans `main` part en
production. Pour l'héberger ailleurs (VPS, conteneur, plateforme Node), il
faut un processus Node.js permanent (`next start`) derrière le HTTPS de
l'hébergeur. Pas d'hébergement « serverless » : l'enregistrement du lead et
les e-mails partent après la réponse au formulaire, dans le même processus.

```bash
# Node.js 22, version de la CI (Next 14 exige au moins 18.17)
npm ci                                # dépendances de développement comprises : le build en a besoin
VERCEL_ENV=production npm run build   # serveur de production uniquement
npm start                             # port 3000 ; PORT=8080 npm start pour un autre
```

1. **`VERCEL_ENV=production` au build, sur le serveur de production
   seulement.** Le code garde le comportement Vercel : le Pixel Meta, sa
   bannière cookies et la mesure Plausible ne s'activent que si `VERCEL_ENV`
   vaut `production` au moment du build (`next.config.js`). Sans elle, le
   site fonctionne mais ne mesure rien. Ne pas la poser sur un serveur de
   test ni en local.
2. **Variables** : à poser sur le serveur avant le build (les
   `NEXT_PUBLIC_*` sont figées au build), dans l'environnement du service ou
   dans un fichier `.env.production.local` jamais versionné. Modèle :
   `.env.example`. Indispensables en production :

   | Variable | Rôle |
   |---|---|
   | `CRM_PROVIDER` | `resend` : les leads deviennent des contacts Resend |
   | `RESEND_API_KEY` | clé Resend (e-mails et contacts) |
   | `MAIL_FROM` | expéditeur des e-mails au prospect |
   | `MAIL_FROM_INTERNE` | expéditeur de la notification interne (différent de `MAIL_INTERNAL_TO`) |
   | `MAIL_INTERNAL_TO` | destinataires de la notification de lead, séparés par des virgules |
   | `DOSSIER_SECRET` | signature des liens de dossier envoyés par e-mail |
   | `NEXT_PUBLIC_SITE_URL` | adresse publique du site |
   | `EXPORT_TOKEN` | protège l'export CSV `/api/export?token=…` |
   | `RESEND_SEQUENCE_EVENT` | facultative, vide aujourd'hui : aucune séquence d'e-mails ne part (`content/emails/sequence.md`) |

   Les propriétés de contact Resend manquantes sont créées automatiquement
   au premier lead qui en a besoin (`lib/crm/resend.ts`).
3. **Journal des leads** : une copie de secours de chaque lead est écrite
   dans `./data` (ou `JOURNAL_DIR`). Ce dossier doit être inscriptible et
   conservé d'un déploiement à l'autre.
4. **Proxy HTTPS** : il doit transmettre l'en-tête `X-Forwarded-For`, lu par
   l'anti-spam du formulaire.
5. **Bascule** : faire pointer simulateur.rdportage.com vers le nouvel
   hébergeur, puis envoyer un formulaire de test et vérifier le contact
   Resend et la notification interne.

Comptes externes (ceux de RD Portage) : Resend (contacts et e-mails),
Plausible (site simulateur.rdportage.com), Meta (pixel 4019768748330072).
Réglages : `docs/schema-lead.md`, `docs/mesure-sans-cookie.md`,
`docs/meta-pixel.md`.

La CI GitHub (`.github/workflows/ci.yml`) vérifie les types, les tests
unitaires et le parcours complet sur iPhone (Playwright) à chaque PR, quel
que soit l'hébergeur. Hors Vercel, il n'y a plus d'aperçu par PR.

## Contenus à compléter par RD Portage

- Mentions légales : nom du garant financier et numéro de police
  (`app/mentions-legales/page.tsx`, marqué `TODO(client)`).
- Politique de confidentialité : deux points marqués `TODO(juridique)`
  (`app/confidentialite/page.tsx`).
- Comparatif nominatif : désactivé, ne pas l'activer sans validation
  juridique (`docs/activation-comparatif.md`).
