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
npm run report:weekly  # rapport KPI Markdown
```

## Arborescence

| Dossier | Contenu |
|---|---|
| `app/` | Next.js App Router : landing, `/simulateur`, API routes lead/event/export |
| `lib/fiscal/` | Moteur IR + paie portage + 3 scénarios, tests Vitest, `AUDIT.md` du proto Manus |
| `lib/crm/` | `lead_schema_v1` (Zod), interface CRMAdapter, Brevo/Airtable + stubs, file + journal NDJSON |
| `lib/tracking/` | UTM first/last touch, événements funnel (Plausible, GA4 en option) |
| `content/claims.ts` | Tous les chiffres Atarhib/Targhib avec source obligatoire |
| `content/emails/` | 6 emails (J0→J14) en HTML + texte, objets A/B |
| `docs/` | Convention UTM, schéma lead, branchement CRM, bascule, procédure Linda, comparatif |

## Variables d'environnement

Copier `.env.example` → `.env.local`. Par défaut tout fonctionne en mode
mock (aucune clé requise) : les leads vont dans `data/leads-fallback.ndjson`.

## Avant la mise en ligne (checklist)

- [ ] `NEXT_PUBLIC_RDV_URL` (lien Calendly du Diagnostic 30 min)
- [ ] `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (domaine de prod)
- [ ] CRM réel (`docs/branchement-brevo-airtable.md`) + `EXPORT_TOKEN`
- [ ] Photo sobre de Ridha (section fondateur) + nom du garant financier
      (mentions légales)
- [ ] Vérifier le plafond exact de l'abattement 10 % (constante
      `ABATTEMENT_10_2026`, marquée TODO(verify))
- [ ] Claims `[SOURCE REQUISE]` : sourcer ou retirer avant publication
- [ ] Comparatif nominatif : NE PAS activer sans validation juridique
      (`docs/activation-comparatif.md`)
