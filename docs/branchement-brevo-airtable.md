# Brancher Brevo ou Airtable

Le funnel tourne par défaut en `CRM_PROVIDER=mock` (tout est journalisé en
NDJSON, zéro perte). Pour basculer sur un vrai CRM :

## Option A — Brevo (recommandé : emails + CRM au même endroit)

1. Créer un compte Brevo, générer une clé API v3 (Paramètres → Clés API).
2. Créer les **attributs de contact** (Contacts → Paramètres → Attributs) :
   `PRENOM` (texte), `LEAD_ID` (texte), `STATUT_ACTUEL` (texte),
   `TJM_OU_CA` (nombre), `ECONOMIE_ANNUELLE` (nombre),
   `SCENARIO_OPTIMAL` (texte), `FUNNEL_STAGE` (texte), `LEAD_SOURCE` (texte),
   `CONSENT_TS` (texte), `POLICY_VERSION` (texte), `LAST_EVENT` (texte),
   `LAST_EVENT_AT` (texte).
3. Créer une **liste** « Séquence 14 jours » ; noter son ID.
4. Créer l'**automation** : déclencheur = contact ajouté à cette liste,
   puis 6 envois (J0, J2, J4, J7, J10, J14) avec les templates de
   `content/emails/` (voir `content/emails/objets.md`).
5. Variables d'environnement (Vercel → Settings → Environment Variables) :
   ```
   CRM_PROVIDER=brevo
   BREVO_API_KEY=xkeysib-...
   BREVO_SEQ14_LIST_ID=12
   ```

## Option B — Airtable (recommandé si Linda veut une vue tableur)

1. Créer une base avec deux tables :
   - **Leads** : champs `lead_id`, `created_at`, `prenom`, `email`,
     `telephone`, `statut_actuel`, `tjm_ou_ca`, `jours_factures`,
     `economie_annuelle_eur`, `funnel_stage` (single select),
     `lead_source`, `device`, `consentement_marketing` (checkbox),
     `consent_timestamp`, `policy_version`, `sequence_a_declencher`,
     `raw_json` (long text).
   - **Events** : `lead_id`, `event`, `timestamp`, `metadata`.
2. Créer un token personnel (scopes `data.records:read/write` sur la base).
3. Variables d'environnement :
   ```
   CRM_PROVIDER=airtable
   AIRTABLE_API_KEY=pat...
   AIRTABLE_BASE_ID=app...
   ```
4. Emails : Airtable ne sait pas envoyer la séquence. L'adapter marque le
   lead (`sequence_a_declencher=seq14`) ; brancher une automation
   Make/Zapier ou un sync Airtable→Brevo sur ce champ.

## Export CSV (workflow Excel de Linda, transition)

`GET https://<domaine>/api/export?token=<EXPORT_TOKEN>` → CSV (`;`)
compatible Excel : prenom, email, téléphone, statut, TJM, économie, stage,
source, consentement. Définir `EXPORT_TOKEN` dans les variables d'env.

## Garantie zéro perte

Toute écriture passe par une file (3 tentatives, backoff exponentiel) et un
journal local `data/leads-fallback.ndjson`. Si le CRM est down, rejouer :
`npx tsx scripts/replay-journal.ts`.
