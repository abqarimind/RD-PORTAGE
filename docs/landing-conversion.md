# Parcours de conversion (refonte du 14/10)

Références et principes : `docs/cro/references-mobbin.md`. Détail du parcours,
chiffres avant/après et textes à valider : `docs/cro/parcours-conversion.md`.

## Routes

| URL | Contenu |
|---|---|
| `/` | Accueil, variante par défaut (« Calcule ton vrai taux ») |
| `/?utm_content=<annonce>` | Variante de la pub, servie par le middleware (`/v/<clé>`, statique) ; l'adresse ne change pas |
| `/lp/a` · `/lp/b` · `/lp/c` | Anciennes landings : réécrites vers la variante de leur angle (ou celle de la pub) |
| `/simulateur` | Simulateur foyer allégé ; le formulaire de rappel est sur l'écran du résultat |

Titres par annonce : `config/headlines.ts` (titres validés uniquement).

## URL des publicités Meta

```
https://simulateur.rdportage.com/?utm_source=meta&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}
```

Le nom d'annonce (`utm_content`) choisit le titre d'accueil : `A_Offre_s01`,
`B_Foyer_s04`, `C_Fondateur_s03`, `C01_FicheDePaie_TOF`, `C03_PlusDeFake_TOF`,
`C06_MemeTJM_MOF`, `C09_AncienPorte_TOF`, `C16_SansEmail_BOF` (et leurs
déclinaisons de même préfixe). Toute autre valeur affiche le titre par défaut.

## Mesure

- Pixel Meta : `docs/meta-pixel.md` (ViewContent `content_name = lp_<clé>`,
  Lead `content_name = simulateur_dossier` ou `rappel_fourchette`).
- Mesure sans cookie : `docs/mesure-sans-cookie.md`.
- Garde-fou de bout en bout : `e2e/tracking.spec.ts` (CI).
