# Convention UTM — RD Portage

À respecter sur TOUTES les campagnes. Le `lead_source` est dérivé du
first-touch (immuable, cookie 90 jours) ; le last-touch est écrasé à chaque
session.

## Valeurs autorisées

| Paramètre | Valeurs |
|---|---|
| `utm_source` | `google`, `linkedin`, `youtube`, `coldcall`, `cooptation`, `brevo` (emails), `facebook`, `instagram`, `meta` |
| `utm_medium` | `cpc`, `paid_social`, `organic`, `social`, `outbound`, `referral`, `email` |
| `utm_campaign` | format `AAAA-MM_nom-campagne` (ex. `2026-07_lancement`) ; emails : `seq14_jN` ; test Meta : `rd-leads-test` |
| `utm_content` | créa / angle / format, ex. `angleA-hook1-video`, `angleB-hook2-image` |
| `utm_term` | mot-clé ou audience (optionnel) |

`fbclid` (ajouté par Meta au clic) est capté et persisté comme les UTM
(cookie + localStorage) ; il sert à reconstruire le cookie `_fbc` pour le
matching Pixel/CAPI. Les landings payantes vivent sous `/lp/<angle>` (a / b / c)
et masquent la navigation (cf. docs/landing-conversion.md).

## Dérivation lead_source (lib/tracking/utm.ts)

| Première touche | lead_source |
|---|---|
| `utm_source=coldcall` | `chaud_coldcall` |
| `utm_source=cooptation` | `chaud_cooptation` |
| `utm_source=linkedin` | `froid_linkedin` |
| `utm_source=youtube` | `froid_youtube` |
| `utm_source=facebook`/`instagram`/`meta` ou `fbclid` présent | `froid_ads` |
| `utm_medium=cpc`/`paid_social` ou `gclid` présent | `froid_ads` |
| `utm_medium=organic` ou referrer Google | `froid_seo` |
| sinon | `direct` |

> Note : l'énum `lead_source` (lead_schema_v1) est fermée — le trafic Meta est
> rangé dans `froid_ads` pour ne pas faire évoluer le schéma. La source précise
> reste lisible dans `attribution.first_touch.utm_source` / `fbclid`.

## Exemples

- LinkedIn organique : `?utm_source=linkedin&utm_medium=social&utm_campaign=2026-07_transparence`
- Google Ads : `?utm_source=google&utm_medium=cpc&utm_campaign=2026-07_simulateur`
- Meta Ads (angle A) : `/lp/a?utm_source=facebook&utm_medium=paid_social&utm_campaign=rd-leads-test&utm_content=angleA-hook1-video`
- Cold call (lien envoyé par SMS) : `?utm_source=coldcall&utm_medium=outbound&utm_campaign=2026-07_linda`
- Email J4 : `?utm_source=brevo&utm_medium=email&utm_campaign=seq14_j4`
