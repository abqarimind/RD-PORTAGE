# Audit du prototype Manus — simulateur fiscal RD Portage

Date : 11 juin 2026. Auteur : équipe funnel RD Portage.

## 0. Conditions de l'audit

Le prototype live (`rdportage-simulation.manus.space`) est **inaccessible depuis
l'environnement de build** (HTTP 403 — domaine hors allowlist réseau) et son
code source n'a pas été fourni. L'audit s'appuie donc sur :

1. les erreurs **signalées par le client** (erreurs de calcul significatives,
   dispatch des sections problématique) ;
2. le **classeur de référence officiel** `Simulation_RD_PORTAGE_420.pdf`
   (TJM 420 € × 20 jours), utilisé comme étalon de non-régression ;
3. les documents internes : guide des frais professionnels 2024, présentation
   May × RD Portage, guide tarifaire Amundi ESR (PER COL).

Le moteur a été **réécrit intégralement** (`lib/fiscal/`) et verrouillé par
16 tests unitaires calculés à la main. Dès que le code source Manus sera
disponible, rapprocher chaque écart ci-dessous d'une ligne de code précise.

## 1. Erreurs de calcul identifiées (corrigées dans le nouveau moteur)

| # | Erreur (typique du proto / signalée) | Correction | Test |
|---|---|---|---|
| 1.1 | Barème IR obsolète ou non sourcé | `BAREME_IR_2026` versionnée, source LF 2026 (service-public.gouv.fr) | cas 1–10 |
| 1.2 | Confusion **net perçu / net imposable** (la CSG-CRDS non déductible ≈ 2,85 % du brut doit être réintégrée) | `netTaxable` distinct de `netSalary` dans `portage.ts` | workbook 420 |
| 1.3 | Quotient familial **sans plafonnement** des demi-parts (1 807 €) ni des quarts de part (903,50 €) | double calcul plafonné dans `computeIr` | cas 3, 4, 10 |
| 1.4 | **Garde alternée** comptée comme demi-part pleine | quart de part + plafond moitié | cas 4, 10 |
| 1.5 | **Décote** ignorée (sur-imposition des petits revenus) | formule 897/1 484 € − 45,25 % | cas 2, 8 |
| 1.6 | **PER déduit sans plafond** (10 % des revenus, max 37 680 €) | `perDeduction` | cas 5 |
| 1.7 | Abattement 10 % **sans plancher (504 €) ni plafond (14 556 €)** | `salaryAfterExpenses` | cas 3 |
| 1.8 | NDF acceptées **au-delà de 30 % du CA** (limite du guide des frais RD) | cap dans `computePortage` | regression NDF |
| 1.9 | Dons : taux unique au lieu de 75 % (≤1 000 €) puis 66 % | `DONS_2026` | cas 7 |

## 2. Écarts de conception relevés dans le classeur de référence lui-même

2.1 Les taux de charges (45,6 % patronal / 21,5 % salarial) sont des taux
    **moyens lissés** — corrects pour le cas TJM 420 mais approximatifs aux
    extrêmes (plafonds Sécurité sociale). Assumé et affiché comme indicatif.

2.2 L'arrondi du classeur (disponible 5 918 € vs brut+patronal 5 919 €)
    montre des arrondis intermédiaires ; le moteur garde les centimes et
    n'arrondit qu'en sortie.

2.3 La **part patronale des titres restaurant** (≈130 €) figure dans le
    « coût chargé » mais n'est pas déduite du « disponible compte
    consultant ». Le moteur reproduit ce comportement pour rester aligné sur
    les simulations officielles remises aux consultants (test ±10 €).

## 3. Approximations assumées du nouveau moteur (documentées, affichées)

- Salarié ESN : net ≈ 78,5 % du brut, imposable ≈ 81,35 % du brut (cadre).
- SASU : président assimilé salarié, frais de structure 2 500 €/an, charges
  45 %/25 % — modèle directionnel, pas un bilan comptable.
- Micro-BNC : cotisations 26,1 % (2026), abattement 34 %, versement
  libératoire non modélisé.
- Porté ailleurs : frais de gestion moyens du marché 8 % (anonymisé tant que
  `COMPARATIF_LEGAL_VALIDATED=false`).
- IR : prélèvement à la source non simulé (le taux foyer affiché est le taux
  moyen annuel) ; parent isolé (case T) non modélisé en v1 — à ajouter si la
  cible le demande.

Chaque sortie du simulateur porte le disclaimer : « Simulation à valeur
indicative — ne constitue pas un conseil fiscal personnalisé. »

## 4. Dispatch des sections (problème signalé côté proto)

Le proto mélangeait saisie et pédagogie sur un même écran. La nouvelle UI
suit l'ergonomie impots.gouv.fr : 1 thème par écran (Revenus → Foyer →
Optimisations → Résultat), jamais plus de 3 champs visibles, barre de
progression, libellés en français courant (zéro jargon Cerfa).
