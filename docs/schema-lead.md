# Schéma canonique du lead — `lead_schema_v1`

Source de vérité : `lib/crm/schema.ts` (Zod, validé à chaque frontière :
client → API route → adapter CRM). Ne jamais modifier v1 : créer
`lead_schema_v2` et une migration.

## Structure

```json
{
  "lead_id": "uuid",
  "schema_version": "lead_schema_v1",
  "created_at": "ISO8601",
  "identity": { "email": "", "first_name": "", "phone": "optionnel" },
  "profile": {
    "statut_actuel": "salarie_esn | freelance_micro | freelance_sasu | porte_ailleurs | transition",
    "tjm_ou_ca": 0,
    "jours_factures": 0,
    "foyer": { "situation": "celibataire | marie_pacse", "enfants": 0, "garde_alternee": 0 }
  },
  "simulation": { "inputs": {}, "scenarios": [], "economie_annuelle_eur": 0, "completed": true },
  "consent": { "marketing_optin": true, "timestamp": "ISO8601", "policy_version": "privacy-2026-06", "ip_hash": "sha256/32" },
  "attribution": {
    "first_touch": { "utm_source": "...", "timestamp": "ISO8601" },
    "last_touch": { "...": "idem" },
    "lead_source": "froid_seo | froid_ads | froid_linkedin | froid_youtube | chaud_coldcall | chaud_cooptation | direct",
    "device": "mobile | desktop"
  },
  "funnel_stage": "interet | consideration | decision | signe | perdu",
  "funnel_events": [{ "event": "lead_submitted", "timestamp": "ISO8601", "metadata": {} }]
}
```

## Taxonomie fermée des événements (par acte)

- **INTÉRÊT** : `page_view`, `diag_started`, `diag_q1/q2/q3_answered`, `diag_completed`
- **CONSIDÉRATION** : `sim_started`, `sim_step_1/2/3_completed`, `sim_completed`, `email_gate_viewed`, `lead_submitted`
- **DÉCISION** : `pdf_downloaded`, `email_opened`, `email_clicked`, `rdv_clicked`, `rdv_booked`, `call_done`*, `signe`*

\* saisis manuellement côté CRM — voir `docs/procedure-linda.md`.

## RGPD

- Consentement : case non pré-cochée, horodatage + version de politique + hash IP.
- Effacement : `deleteLead(leadId)` sur l'adapter (toutes implémentations).
- Le journal NDJSON local (`data/leads-fallback.ndjson`) doit être purgé lors
  d'une demande d'effacement (grep sur le lead_id).
