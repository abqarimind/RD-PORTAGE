# Activation du comparatif nominatif

Le tableau comparatif (section Preuve de la landing) tourne par défaut en
mode **anonymisé** : « Acteur A — marge publique X % ». La version nominative
(ex. Admissions) est construite mais verrouillée.

## Pré-requis juridiques (à valider AVANT activation)

1. Chaque ligne concurrente de `content/claims.ts` (`COMPETITORS`) doit
   avoir un champ `source` complet : libellé + **URL officielle publique**
   (site du concurrent, document légal) + **date de relevé**.
2. Validation écrite du conseil juridique sur la formulation (publicité
   comparative : art. L122-1 et s. du Code de la consommation — exactitude,
   objectivité, pas de dénigrement).
3. Capture d'écran horodatée de chaque source archivée dans le dossier
   juridique.

## Activation (après feu vert)

1. Compléter `COMPETITORS` dans `content/claims.ts` (sources + dates).
2. Sur Vercel : `COMPARATIF_LEGAL_VALIDATED=true` → redéployer.
3. Vérifier le rendu : noms affichés + mention « source : …, relevé le … ».

## Retour arrière immédiat

`COMPARATIF_LEGAL_VALIDATED=false` (ou suppression de la variable) →
redéploiement : la version anonymisée revient. Aucun code à toucher.
