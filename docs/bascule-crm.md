# Procédure de bascule CRM (futur)

Le funnel ne connaît que l'interface `CRMAdapter` (`lib/crm/adapter.ts`) :
`upsertLead`, `appendEvent`, `triggerSequence`, `deleteLead`, `exportCSV`.
Changer de CRM = écrire un adapter + changer une variable d'env. Aucun code
funnel à toucher.

## Étapes

1. **Implémenter** `lib/crm/<nouveau>.ts` en respectant l'interface
   (s'inspirer de `airtable.ts`). Les stubs `google-sheet` et `custom`
   existent déjà dans `lib/crm/stubs.ts`.
2. **Enregistrer** l'adapter dans `ADAPTERS` (`lib/crm/index.ts`).
3. **Migrer l'historique** : chaque lead Airtable porte un champ `raw_json`
   contenant le payload canonique `lead_schema_v1` complet → réimporter via
   `upsertLead`. Depuis Brevo : exporter les contacts + réhydrater depuis le
   journal NDJSON.
4. **Basculer** : `CRM_PROVIDER=<nouveau>` sur Vercel, redéployer.
5. **Vérifier** : soumettre un lead de test, contrôler le journal
   (`data/leads-fallback.ndjson`) — aucune entrée `failed:true`.

## §4 Note sérénité serverless

Sur Vercel, le filesystem est éphémère : le journal NDJSON protège la
requête en cours, mais pour une garantie durable post-bascule, pointer
`JOURNAL_DIR` vers un volume monté ou remplacer `lib/crm/journal.ts` par un
store durable (KV, S3) — l'interface (2 fonctions) est triviale à réécrire.
