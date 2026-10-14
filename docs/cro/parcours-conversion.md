# Parcours de conversion — refonte du 14/10

Objectif : une personne qui touche une pub sur Instagram, sur mobile, dans le
navigateur intégré, comprend en 3 secondes qu'elle est au bon endroit,
commence le diagnostic en un tap et va jusqu'à laisser son numéro.
Références : `docs/cro/references-mobbin.md`.

## Écran par écran

1. **Arrivée = question 1.** Titre de la pub d'origine (`config/headlines.ts`),
   fond encre, surligné jaune, sous-titre d'une ligne. Carte blanche avec la
   question 1, rendue côté serveur. En 375 × 667, les quatre réponses sont
   visibles au-dessus de la bannière cookies (vérifié par le test e2e).
2. **Question 2** : TJM par tranche. Retour arrière sans perte.
3. **Question 3** : le foyer (seul·e sans enfant, en couple sans enfant, avec
   enfant(s)). Elle prépare le simulateur.
4. **La valeur, sans coordonnées** : fourchette de net, hypothèses avouées,
   « ce chiffre ne dit rien de ton impôt », puis deux suites :
   « Calculer mon vrai taux — 2 min » ou « Être rappelé par Ridha ».
   Ridha (photo et citation déjà en ligne), 4 % de frais, mention légale.
5. **Rappel direct** (option) : prénom, téléphone, e-mail, case conseils
   facultative. Confirmation avec ce qui va se passer et quand.
6. **Activité** : structure (si freelance), TJM repris, jours ; frais et
   avantages repliés (« Affiner (facultatif) », valeurs retenues affichées).
   Lien « Passer : être rappelé par Ridha ».
7. **Foyer** : seulement ce qui s'applique (conjoint si couple, enfants si
   enfants, garde alternée s'il y a des enfants, leviers repliés). Sauté pour
   une personne seule sans enfant.
8. **Résultat + rappel sur le même écran**, puis le détail du calcul.
   Confirmation : « C'est noté, {Prénom}. Ridha t'appelle sous 24 h au … »,
   dossier, « Pressé ? Appeler le 01 71 49 71 57 ».

## Avant / après (mobile, jusqu'à l'envoi du téléphone)

| | Avant (production, 14/10) | Après : rappel dès la fourchette | Après : calcul complet |
|---|---|---|---|
| Écrans | 8 | 5 | 7 (6 sans écran Foyer) |
| Champs affichés | 20 | 7 | 13 |
| Champs à remplir | 5, téléphone facultatif | 6, téléphone obligatoire | 6, téléphone obligatoire |
| Taps (hors saisie au clavier) | 12 + défilement pour trouver la question 1 | 9, sans défilement | 11 (10 sans écran Foyer) |
| Question 1 au premier écran (375 × 667) | non : sous la bannière et sous la ligne de flottaison | oui, ses 4 réponses aussi | oui |

Lighthouse mobile (simulation 4G lente, même machine, `next start`) :

| | `main` | Branche B | Production (14/10, pour mémoire) |
|---|---|---|---|
| Performance | 64 à 83 | 98 à 99 | 85 |
| Accessibilité | 96 | 100 | 96 |
| LCP | 2,3 à 4,0 s | 1,8 à 2,3 s | 2,5 s |
| CLS | 0,165 (bannière) | 0 | 0,165 |
| Polices | 104 Ko, feuille Google bloquante | 25 Ko, auto-hébergées | 104 Ko |
| JavaScript | 128 Ko | 128 Ko (socle Next.js) | 130 Ko |

## Textes à faire valider par Ridha

1. **Tutoiement** sur tout le parcours (accueil, simulateur, formulaire), pour
   rester dans le ton des pubs. Les e-mails, le dossier, la bannière cookies et
   les pages légales restent au vouvoiement.
2. Sous-titre d'accueil : « 3 questions, ta fourchette de net tout de suite. Sans e-mail. »
3. Pastille des angles fondateur : « Ridha Chammam, fondateur, ancien consultant porté ».
4. Question 2 : « Ton TJM, à peu près ». Question 3 : « Et ton foyer ? » —
   « Seul·e, sans enfant » / « En couple, sans enfant » / « Avec enfant(s) ».
   Sous les réponses : « Sans e-mail · gratuit · fourchette immédiate ».
5. Fourchette : « Ton net estimé chaque mois, en portage RD » ; « Estimation
   prudente : 20 jours facturés, sans tes avantages ni tes frais. Le calcul
   complet ne peut que faire mieux. » ; « Ce chiffre ne dit rien de ton impôt.
   Ton vrai taux d'imposition de foyer se calcule à l'étape suivante, avec tes
   réponses déjà reprises. »
6. Boutons : « Calculer mon vrai taux — 2 min », « Être rappelé par Ridha »,
   « Passer : être rappelé par Ridha », « Être rappelé sous 24 h ».
7. Formulaire : « Ridha vérifie ta fourchette / ce calcul avec toi » ; « Au
   téléphone, sous 24 h. Gratuit, sans engagement. » ; « Il ne sert qu'à ce
   rappel. » ; « Pour t'écrire si on ne te joint pas. » ; « Pour recevoir ton
   dossier complet. »
8. **Qui rappelle, depuis quel numéro ?** Les écrans disent « Ridha
   t'appelle sous 24 h » (la décision du 24/09 parlait de « l'équipe »).
   Confirmation : « Demande reçue / Appel de Ridha, sous 24 h / Échange sur ta
   simulation, sans engagement » et « Pressé ? Appeler le 01 71 49 71 57 ».
9. Sections sous la ligne de flottaison, reprises du site actuel et passées
   au tutoiement : « Trois étapes, zéro zone grise. », « Tu valides ton chiffre
   avec lui. Proposition ferme, signature possible sous 48 h. », « Garde-fous
   intégrés… », « 400 € pour 10 000 € de CA porté, sans ligne cachée en bas de page. »
10. Ligne de mention sous le chiffre : « Estimation indicative · RD Portage,
    société de portage salarial · RCS Versailles 912 888 013 ».
11. Couleur du surligné jaune (`#FFE14D`) à caler sur celle des visuels statiques.

Rien d'inventé : pas de témoignage, de compteur, de note, de logo client ni
d'urgence. Les éléments non validés (seuil de 70 %, risque URSSAF, « depuis
2022 », taux de restitution en argument, offre « 1 mois de loyer ») sont
absents de l'accueil.

## À savoir

- Le taux de restitution reste affiché dans le simulateur et le dossier comme
  résultat calculé pour la personne (retours #28 et #34 du 25/09), pas comme
  argument d'accueil.
- La route `/api/demande-diagnostic` (e-mails E3/E4) n'est plus appelée par
  l'interface : la demande de rappel EST le lead. Elle peut être retirée.
- Les libellés de scénarios du moteur (« Votre statut actuel »…) restent au
  vouvoiement : ils sont partagés avec les e-mails et le dossier.
