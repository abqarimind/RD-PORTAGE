# Simulateur RD Portage — architecture & sources

Lead magnet mobile-first, step-by-step. Deux moteurs purs + une config datée
et sourcée. Sortie : 3 scénarios, **vrai taux d'imposition du foyer**, et
« ce que vous laissez sur la table » (count-up).

## Architecture

| Fichier | Rôle |
|---|---|
| `config/fiscal-2026.ts` | **Source unique** des taux/barèmes, datés + sourcés (barème IR, plafond QF, décote, abattement 10 %, PER, PASS, cascade portage, cagnottes). Mise à jour annuelle ici. |
| `lib/fiscal/portage.ts` | **Moteur A** — cascade CA HT → perçu net (+ net imposable annuel). |
| `lib/fiscal/ir.ts` | **Moteur B** — IR du foyer : barème + quotient familial + plafonnement + décote + abattement/frais réels + PER. |
| `lib/fiscal/scenarios.ts` | Assemble les 3 scénarios (actuel / portage classique / RD optimisé). |
| `components/simulator/Simulator.tsx` | UX step-by-step (Profil → Activité → Foyer → Résultats → Lead gate). |
| `lib/fiscal/__tests__/` | Validation : cas de référence portage, 10 cas IR, plafonnement, décote, cagnotte. |

## Valeurs officielles 2026 (vérifiées le 22/06/2026)

- Barème IR 2026 (revenus 2025) : 0 / 11 / 30 / 41 / 45 % aux seuils 11 600 / 29 579 / 84 577 / 181 917 € — service-public.gouv.fr, economie.gouv.fr (indexation +0,9 %).
- Plafonnement quotient familial : **1 807 €/demi-part**.
- Décote : seuils **1 982 € / 3 277 €**, coefficient 0,4525.
- Abattement 10 % : **509 € à 14 555 €** (corrigé : l'ancien code avait 504 / 14 556).
- PER (revenus 2025) : 10 % des revenus pro, **4 710 € à 37 680 €** (PASS 2025 = 47 100 €). PASS 2026 = 48 060 €.
- Cascade portage (frais 4 %, assurances/taxes 0,9 %, NDF 30 %, patronal 45,6 %, salarial 21,5 %, TR 13 €/j) : `Template_Simulation_RD_PORTAGE_V2.xlsx` (« Simul Honoraires »).

## Cas de référence (validé à l'euro)

TJM 420 €, 20 j, NDF 500 €, cagnotte May 1 570 €, titres-resto :
Disponible **5 918 €** · brut **4 065 €** · perçu net + TR **3 821 €** ·
rémunération globale **5 391 €** · restitution **64,2 %**. (cf. `__tests__/ir.test.ts`)

## La cagnotte avantages (« à quoi ça sert »)

Enveloppe d'**avantages salariés exonérés** (chèques cadeaux, services à la
personne, mobilité durable, culture/sport…), financée depuis le compte
d'activité, dans les **plafonds URSSAF**. Elle convertit une partie du CA en
avantages peu/pas chargés plutôt qu'en salaire entièrement chargé — d'où un
gain sur la « rémunération globale ». **Affichée nette des frais de service**
du prestataire. Deux prestataires sont proposés au choix (l'un, l'autre, ou
aucune), à figer avec RD dans `config/fiscal-2026.ts → CAGNOTTE_PROVIDERS` :

- **May** — 1 570 €/mois (cas de référence, sans frais modélisés).
- **Wawashi** — 1 500 €/mois, net de 60 €/an + 3,5 %.

## Honnêteté & conformité

Mention « simulation à valeur indicative » persistante · cagnottes nettes de
frais · panneau « comment c'est calculé » (cascade + sources) · aucune logique
offshore (onglet 2 de l'Excel exclu) · consentement RGPD avant capture du lead.
Le simulateur reste **indicatif** et ne remplace pas un conseil fiscal.
