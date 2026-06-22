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
| `app/` | Next.js App Router : landing, `/simulateur`, `/lp/[angle]` (ads Meta), `/merci`, API routes lead/event/export/capi |
| `app/lp/` | Landings payantes mobile-first (3 angles de hero, sans navigation) — dérivées de `/concept-c` |
| `lib/fiscal/` | Moteur IR + paie portage + 3 scénarios, tests Vitest, `AUDIT.md` du proto Manus |
| `lib/crm/` | `lead_schema_v1` (Zod), interface CRMAdapter, Brevo/Airtable + stubs, file + journal NDJSON |
| `lib/tracking/` | UTM first/last touch + fbclid, événements funnel (Plausible), bridge Meta Pixel/CAPI + consentement |
| `lib/server/capi.ts` | Conversions API serveur (hash SHA-256, dédup par `event_id`) |
| `content/claims.ts` | Tous les chiffres Atarhib/Targhib avec source obligatoire |
| `content/emails/` | 6 emails (J0→J14) en HTML + texte, objets A/B |
| `docs/` | Convention UTM, schéma lead, branchement CRM, **landing-conversion.md** (système ads Meta), etc. |

## Variables d'environnement

Copier `.env.example` → `.env.local`. Par défaut tout fonctionne en mode
mock (aucune clé requise) : les leads vont dans `data/leads-fallback.ndjson`.

## Avant la mise en ligne (checklist)

- [x] Photo de Ridha (section fondateur) — `public/ridha.png`
- [x] CTA Diagnostic : appel direct +33 6 32 98 87 23 par défaut ;
      définir `NEXT_PUBLIC_RDV_URL` plus tard si un Calendly arrive
- [ ] `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (domaine de prod)
- [ ] CRM réel (`docs/branchement-brevo-airtable.md`) + `EXPORT_TOKEN`
- [ ] Nom du garant financier (mentions légales)
- [ ] Vérifier le plafond exact de l'abattement 10 % (constante
      `ABATTEMENT_10_2026`, marquée TODO(verify))
- [ ] Claims `[SOURCE REQUISE]` : sourcer ou retirer avant publication
- [ ] Comparatif nominatif : NE PAS activer sans validation juridique
      (`docs/activation-comparatif.md`)
