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
  "identity": { "email": "", "first_name": "", "phone": "+33612345678 (E.164, obligatoire à l'envoi depuis le 14/10)" },
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
  "funnel_events": [{ "event": "lead_submitted", "timestamp": "ISO8601", "metadata": {} }],
  "journey": { "angle": "lp_b", "last_step": "inscription", "summary": "résumé interne, calculé par le serveur" }
}
```

Le téléphone reste facultatif dans le schéma (leads antérieurs au 14/10),
mais `/api/lead` le rend **obligatoire** et le normalise en E.164
(`lib/phone.ts` : 06…, +33…, 0033…, espaces et points acceptés ; numéros
étrangers au format international). `journey` est facultatif (ajout
rétrocompatible) ; `summary` n'est jamais pris au navigateur.

## Propriétés de contact Resend (`CRM_PROVIDER=resend`)

**À créer dans Resend → Contacts → Propriétés avant tout lead.** Resend
refuse le contact entier dès qu'une seule clé n'existe pas (« One or more
properties do not exist ») : c'est ce qui a fait échouer chaque lead de
production jusqu'au 14/10. Source unique : `RESEND_CONTACT_PROPERTIES` dans
`lib/crm/resend.ts`. Si une propriété manque malgré tout, le contact est
enregistré sans propriétés et la notification interne arrive avec
`[ALERTE]`, la liste des clés manquantes et les données brutes.

| Clé | Type | Contenu |
|---|---|---|
| `lead_id` | string | identifiant du lead |
| `created_at` | string | date d'envoi (ISO) |
| `telephone` | string | E.164, ex. +33612345678 |
| `statut_actuel` | string | salarie_esn, freelance_micro… |
| `tjm_ou_ca` | number | TJM retenu par le calcul |
| `jours_factures` | number | jours par mois |
| `economie_annuelle_eur` | number | écart annuel (peut être négatif) |
| `economie_mensuelle` | number | idem / 12 (séquence J14) |
| `sequence_stop` | string | oui / non |
| `funnel_stage` | string | consideration, decision… |
| `lead_source` | string | froid_ads, direct… |
| `consentement_marketing` | string | oui / non |
| `consent_ts` | string | horodatage du consentement |
| `policy_version` | string | version de la politique |
| `utm_source` | string | ex. meta |
| `utm_medium` | string | ex. paid_social |
| `utm_campaign` | string | nom de campagne |
| `utm_content` | string | nom de l'annonce, ex. B_Foyer_s04 |
| `fbclid_present` | string | oui / non (la valeur elle-même n'est pas stockée) |
| `angle` | string | landing d'arrivée, ex. lp_b |
| `derniere_etape` | string | écran d'envoi, ex. inscription |
| `appareil` | string | mobile / desktop |
| `resume_simulation` | string | résumé interne (500 caractères max) |
| `last_event` | string | dernier événement de parcours |
| `last_event_at` | string | sa date |

## Taxonomie fermée des événements (par acte)

- **INTÉRÊT** : `page_view` (n'est plus émis depuis le 14/10 : Plausible compte les pages lui-même), `diag_started`, `diag_q1/q2/q3_answered`, `diag_completed`
- **CONSIDÉRATION** : `sim_started`, `sim_step_1/2/3_completed`, `sim_completed`, `email_gate_viewed`, `lead_submitted`
- **DÉCISION** : `pdf_downloaded`, `email_opened`, `email_clicked`, `rdv_clicked`, `rdv_booked`, `call_done`*, `signe`*

\* saisis manuellement côté CRM — voir `docs/procedure-linda.md`.

## RGPD

- Consentement : case non pré-cochée, horodatage + version de politique + hash IP.
- Effacement : `deleteLead(leadId)` sur l'adapter (toutes implémentations).
- Le journal NDJSON local (`data/leads-fallback.ndjson`) doit être purgé lors
  d'une demande d'effacement (grep sur le lead_id).
