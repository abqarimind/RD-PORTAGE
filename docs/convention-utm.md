# Convention UTM — RD Portage

À respecter sur TOUTES les campagnes. Le `lead_source` est dérivé du
first-touch (immuable, cookie 90 jours) ; le last-touch est écrasé à chaque
session.

## Valeurs autorisées

| Paramètre | Valeurs |
|---|---|
| `utm_source` | `google`, `linkedin`, `youtube`, `coldcall`, `cooptation`, `brevo` (emails) |
| `utm_medium` | `cpc`, `organic`, `social`, `outbound`, `referral`, `email` |
| `utm_campaign` | format `AAAA-MM_nom-campagne` (ex. `2026-07_lancement`) ; emails : `seq14_jN` |

## Dérivation lead_source (lib/tracking/utm.ts)

| Première touche | lead_source |
|---|---|
| `utm_source=coldcall` | `chaud_coldcall` |
| `utm_source=cooptation` | `chaud_cooptation` |
| `utm_source=linkedin` | `froid_linkedin` |
| `utm_source=youtube` | `froid_youtube` |
| `utm_medium=cpc` ou `gclid` présent | `froid_ads` |
| `utm_medium=organic` ou referrer Google | `froid_seo` |
| sinon | `direct` |

## Exemples

- LinkedIn organique : `?utm_source=linkedin&utm_medium=social&utm_campaign=2026-07_transparence`
- Google Ads : `?utm_source=google&utm_medium=cpc&utm_campaign=2026-07_simulateur`
- Cold call (lien envoyé par SMS) : `?utm_source=coldcall&utm_medium=outbound&utm_campaign=2026-07_linda`
- Email J4 : `?utm_source=brevo&utm_medium=email&utm_campaign=seq14_j4`
