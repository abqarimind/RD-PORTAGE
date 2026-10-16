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

## En production

- **Site** : https://simulateur.rdportage.com, hébergé sur Vercel (projet
  `rd-portage`). Chaque fusion dans `main` part en production ; chaque PR a
  son aperçu (Preview), protégé par une connexion Vercel. Le Pixel Meta est
  coupé sur les aperçus.
- **CI** (`.github/workflows/ci.yml`) : vérification des types, tests
  unitaires et parcours complet sur iPhone (Playwright), à chaque PR.
- **Comptes externes** (ceux de RD Portage) : Resend (contacts et e-mails),
  Plausible (site simulateur.rdportage.com), Meta (pixel 4019768748330072).
  Réglages : `docs/schema-lead.md`, `docs/mesure-sans-cookie.md`,
  `docs/meta-pixel.md`.

Variables de production (Vercel → Settings → Environment Variables) :

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
| `NEXT_PUBLIC_META_PIXEL_DEBUG` | facultative, Preview seulement : active le Pixel sur un aperçu pour « Tester les événements » |

Les propriétés de contact Resend manquantes sont créées automatiquement au
premier lead qui en a besoin (`lib/crm/resend.ts`).

## Reprendre le projet

Pour que RD Portage héberge le site sur ses propres comptes, sans
ressaisir les variables :

1. **GitHub** : transférer le dépôt vers le compte ou l'organisation de RD
   Portage (Settings → General → Danger Zone → Transfer ownership).
   L'historique, les PR et la CI suivent.
2. **Vercel** : RD Portage invite l'actuel propriétaire du projet dans son
   équipe Vercel. Celui-ci ouvre le projet → Settings → General → Transfer
   Project, et choisit cette équipe. Les variables, le domaine
   simulateur.rdportage.com, les déploiements et le lien Git suivent, sans
   interruption du site ([documentation](https://vercel.com/docs/projects/transferring-projects)).
   Le site étant commercial, l'équipe d'arrivée doit être sur l'offre Pro.
3. Après les deux transferts : dans Vercel → Settings → Git, vérifier que le
   projet est relié au dépôt transféré (l'application Vercel doit avoir accès
   au dépôt chez RD Portage), puis relancer un déploiement de production.

Sans transfert possible : importer le dépôt dans un nouveau projet Vercel,
recréer les variables du tableau ci-dessus, puis rattacher le domaine
simulateur.rdportage.com.

## Contenus à compléter par RD Portage

- Mentions légales : nom du garant financier et numéro de police
  (`app/mentions-legales/page.tsx`, marqué `TODO(client)`).
- Politique de confidentialité : deux points marqués `TODO(juridique)`
  (`app/confidentialite/page.tsx`).
- Comparatif nominatif : désactivé, ne pas l'activer sans validation
  juridique (`docs/activation-comparatif.md`).
