# Rapport — optimisation responsive

Session du 15/09/2026 · branche `claude/new-session-xtn0ey`
Miroir de l'annexe §8 du rapport de maintenance : **avant / après, chiffré**.

Mesures au navigateur sur 9 routes × 8 largeurs (390, 430, 768, 1024, 1280,
1600 px, plus le paysage à 390 et 430), et parcours complet de bout en bout
au téléphone et à la tablette.

---

## 0. Résumé

| | Avant | Après |
|---|---|---|
| Cibles tactiles sous 44 px (toutes largeurs) | 242 | **48**, toutes des liens en ligne laissés volontairement |
| Cibles hors liens en ligne restant à traiter | 242 | **0** |
| Débordements horizontaux | 0 | **0** |
| CLS `/lp/b` (mobile bridé) | 0,156 | **0** |
| CLS `/simulateur` | 0,111 | **0,038** |
| LCP `/lp/b` | 636 ms | **636 ms** |
| Largeur du titre à 768 px | 344 px, 5 lignes | **736 px, 2 lignes** |
| Tests | 140 | **147** |

**Aucune couleur, typographie, rayon de bordure ni ombre n'a été modifié.**
L'arbitrage de charte reste entier ; la liste de ce qu'il bloque est au §7.

**Rien n'est promu en production** : la branche est poussée, le déploiement
attend votre feu vert.

---

## 1. Un bug sérieux trouvé en chemin, sans rapport avec le responsive

Je le mets en tête parce qu'il est plus grave que tout le reste de cette
session, et qu'il était en production.

**Symptôme :** en rejouant le parcours complet au téléphone, l'écran final
affichait « Aucun dossier à afficher » après une inscription réussie.

**Cause racine :** une régression que j'ai introduite en rendant le profil
nullable à la session précédente. La validation des formulaires reçus de
l'extérieur comparait `typeof v === typeof DEFAULT_FORM[k]`. Comme
`typeof null` vaut `"object"`, un profil transmis sous forme de chaîne ne
correspondait jamais, et était écarté **en silence**.

**Deux conséquences, toutes deux en production :**

1. Côté serveur, le récapitulatif était jugé non calculable : **aucun email de
   récapitulatif n'était envoyé, et aucun lien de dossier n'était généré.**
   Le journal disait « récapitulatif non calculable » sans que rien ne remonte
   à l'utilisateur.
2. Côté navigateur, la restauration locale perdait le profil : un
   rafraîchissement en cours de simulation renvoyait à l'étape Profil.

**Pourquoi les tests ne l'ont pas vu :** ils appelaient le constructeur de
récapitulatif directement, jamais à travers la validation. C'est le parcours
navigateur de bout en bout qui l'a révélé — la leçon vaut d'être retenue.

**Correctif :** une validation explicite, champ par champ, dans une source
unique partagée par la restauration locale et les routes d'API. Sept tests la
couvrent, dont la garantie qu'un formulaire transmis par le navigateur produit
bien un récapitulatif.

---

## 2. Le système retenu

### 2.1 Points de rupture — l'échelle standard, mais réellement employée

Le constat de l'annexe : `sm:` 21 fois, `md:` 139 fois, `lg:`/`xl:`/`2xl:`
jamais. Deux états seulement, « mobile » et « ≥ 768 px ».

**Je n'ai pas inventé d'échelle.** Le problème n'était pas le nombre de
points de rupture disponibles mais le fait qu'un seul, `md:` (768), faisait
double emploi : il servait à la fois de seuil « tablette » et de seuil
« desktop ». Une tablette en portrait recevait donc la composition **et**
l'échelle typographique desktop dans des colonnes de 344 px.

L'échelle est désormais :

| Palier | Largeur | Rôle |
|---|---|---|
| base | < 640 | Téléphone — une colonne |
| `sm:` | 640 | Grand téléphone — ajustements mineurs (boutons en largeur auto) |
| `md:` | 768 | **Tablette — palier intermédiaire réel** |
| `lg:` | 1024 | **Desktop — composition complète** |
| `max-w-page` | 1140 | Borne haute du contenu |

### 2.2 La règle de décision, mesurée

Plutôt qu'un choix d'intuition, j'ai retenu un critère vérifiable :
**une colonne doit offrir environ 320 px de contenu pour porter du texte.**

Appliqué à 768 px, gouttières comprises :

| Colonnes | Largeur obtenue | Verdict |
|---|---|---|
| 2 | 360 px | acceptable |
| 3 | 240 px | trop étroit |
| 4 | 175 px | inutilisable |

D'où, section par section : ce qui tenait en deux colonnes reste à `md:`, ce
qui demandait trois ou quatre colonnes attend `lg:`.

### 2.3 Rythme vertical

Les sections employaient `py-12`, `py-14`, `py-16`, `pb-12 pt-8 md:pt-12`,
`pb-10 pt-8 md:pt-12` — sans rythme commun. Trois jetons nommés les remplacent :

```
section      48px   téléphone
section-md   56px   tablette
section-lg   72px   desktop
```

Le mobile se resserre légèrement (48 contre 56), ce qui met davantage de
contenu par écran là où arrivent 83 % du trafic, et le desktop s'aère (72
contre 56).

### 2.4 Largeurs nommées

`max-w-page` (1140) cohabitait avec `max-w-3xl` et `max-w-2xl` employés comme
largeurs de conteneur. Trois noms, **aux valeurs strictement inchangées** —
donc aucun changement visuel, mais une intention lisible :

| Nom | Valeur | Usage |
|---|---|---|
| `max-w-page` | 1140 px | Sections pleine largeur (landings) |
| `max-w-reading` | 768 px | Lecture longue (dossier) |
| `max-w-form` | 672 px | Formulaire en une colonne (simulateur) |

---

## 3. Route par route

### `/lp/a`, `/lp/b`, `/lp/c` et variantes `?v=vsl` — priorité 1

**Le hero.** À 768 px il passait en deux colonnes de 344 px, avec l'échelle
typographique desktop : le titre cassait en **cinq lignes**. Il reste empilé
jusqu'à 1024 px, et reçoit un palier typographique intermédiaire à la tablette
— une taille déjà employée ailleurs dans le fichier, donc aucune nouvelle
décision typographique.

| Largeur | Avant | Après |
|---|---|---|
| 768 | titre 344 px, 5 lignes, 48 px | **titre 736 px, 2 lignes, 36 px** |
| 1024 | titre 472 px, 4 lignes | inchangé (composition desktop) |
| 1280 | titre 530 px, 4 lignes | inchangé |

**Les chips de preuve.** Quatre colonnes à 768 donnaient 175 px et les
libellés cassaient sur trois lignes. Elles restent en deux colonnes (360 px)
jusqu'à 1024.

**Les trois étapes.** Trois colonnes à 768 donnaient 240 px. Deux colonnes à
la tablette, trois à partir de 1024 — c'est le palier intermédiaire qui
manquait.

**Le bloc de rappel en bas de page** suit la même logique que le hero.

### `/` — même composant, mêmes correctifs

L'accueil rend la même landing. Il portait en plus la navigation d'en-tête,
dont les trois liens étaient à 54×20, 51×20 et 26×20 px. Ils atteignent
désormais 44 px dans les deux dimensions **sans que l'espacement visuel entre
les libellés ne change** : la gouttière a été réduite d'autant que le padding
a été ajouté.

### `/simulateur` et `/dossier` — déjà conformes, non régressés

Les cibles tactiles et les tailles de champ y étaient déjà correctes (correctif
BUG-05). Vérifié à toutes les largeurs : aucune régression. Les seuls
changements sont le nommage des largeurs, le squelette d'hydratation (§5) et
les animations (§4).

Le dossier reste à 768 px de large même sur un écran de 1600 px : c'est une
largeur de lecture, et l'élargir nuirait au confort. Le nom `max-w-reading`
rend cette intention explicite.

### `/mentions-legales`, `/confidentialite`

Le lien « ← Retour » passe à 44 px. Les liens à l'intérieur des paragraphes
(« Politique de confidentialité », « CNIL ») restent à la hauteur de leur
ligne — voir l'arbitrage au §4.

---

## 4. Cibles tactiles — arbitrage par catégorie

| Catégorie | Arbitrage retenu | Pourquoi |
|---|---|---|
| **Boutons et CTA** | 44 px minimum, obtenu par le padding | La taille visuelle et la taille du texte ne changent pas ; seule la zone tactile s'étend |
| **Liens de navigation** | 44 px dans les deux dimensions, gouttière réduite d'autant | L'espacement visuel entre les libellés reste identique |
| **Liens de pied de page** | Espacés, pas agrandis | Les agrandir aurait cassé le rythme du bloc ; les espacer empêche qu'un doigt en touche deux |
| **Liens en ligne dans un paragraphe** | **Inchangés** | Les agrandir casserait l'interligne du texte pour un bénéfice nul — c'est l'usage admis |

Résultat par route (pire cas sur l'ensemble des largeurs) :

| Route | Avant | Après | dont liens en ligne (laissés) |
|---|---|---|---|
| `/lp/a` · `/lp/b` · `/lp/c` · `?v=vsl` | 3 | **0** | 0 |
| `/` | 6 | **0** | 0 |
| `/simulateur` | 3 | **0** | 0 |
| `/dossier` | 2 | **0** | 0 |
| `/mentions-legales` · `/confidentialite` | 4 | **3** | 3 |

---

## 5. Animations et performance

### 5.1 Recensement de l'existant

Contrairement à ce que supposait le brief, rien d'indiscipliné n'avait été
ajouté depuis : toutes les animations des routes de production respectaient
déjà `prefers-reduced-motion`. Les `@keyframes` non gardées se trouvent
uniquement dans `/concept-a`, `/concept-b` et `/concept-c`, qui ne sont pas
des routes de production.

### 5.2 Ce qui a été corrigé

| Trouvaille | Correctif |
|---|---|
| Barres de progression animées sur `width` (simulateur et diagnostic) | `transform: scaleX` — animer une largeur force un recalcul de mise en page à chaque image |
| 4 × `transition-all` | Bornées aux propriétés réellement animées |
| Transitions sur `width` dans les graphiques du dossier | Retirées : elles portaient sur des valeurs qui ne changent jamais après le rendu |
| Révélation GSAP du dossier | Remplacée par une animation CSS |

**Sur la révélation GSAP.** Chargée par import différé, elle s'exécutait
**après** le premier rendu : le contenu s'affichait, disparaissait, puis
réapparaissait en fondu. Une animation CSS démarre au premier rendu, ne dépend
d'aucun script, n'anime que `opacity` et `transform`, et respecte le mouvement
réduit par simple requête média. Elle retire au passage un chargement différé
d'une cinquantaine de kilooctets sur le dossier.

Vérifié sur un vrai dossier en mouvement réduit : 8 éléments, tous
pleinement visibles, **aucune animation en cours**.

### 5.3 CLS — le décalage le plus coûteux du tunnel

Les deux squelettes d'hydratation que j'avais écrits étaient **plus courts que
le contenu qu'ils annonçaient** : 288 px contre 402 px pour le diagnostic. La
page grandissait donc vers 1 300 ms, c'est-à-dire précisément au moment où
l'utilisateur s'apprête à cliquer sur le CTA.

Ils reprennent désormais la structure exacte du contenu : en-tête, barre de
progression, titre, options, mention.

### 5.4 Mesures mobiles

À 390 px, réseau bridé à 1,6 Mb/s avec 150 ms de latence, processeur divisé
par 4. Médiane de trois chargements.

| Route | LCP avant | LCP après | CLS avant | CLS après |
|---|---|---|---|---|
| `/lp/b` | 636 ms | **636 ms** | 0,156 | **0** |
| `/simulateur` | 1 368 ms | **1 332 ms** | 0,111 | **0,038** |

L'objectif de LCP sous 1,5 s était déjà tenu et le reste. Le CLS passe sous le
seuil de 0,1 sur les deux routes, et à zéro sur celle qui reçoit le trafic
payant.

---

## 6. Vérification

- **Débordement horizontal** : 0 sur 9 routes × 8 largeurs, avant comme après.
- **Champs de saisie sous 16 px** : aucun, avant comme après.
- **Parcours complet de bout en bout**, à 390 px et à 768 px : landing →
  diagnostic → simulateur → foyer → résultats → inscription → dossier.
  19 contrôles, 0 échec, aucune erreur JavaScript.
- **Suite de tests** : 140 → 147, toutes au vert.
- **Typecheck et build** : au vert.

---

## 7. Ce qui reste bloqué par l'arbitrage de charte

C'est la liste à transmettre au designer. Rien de tout cela n'a été touché.

1. **Deux systèmes de couleurs coexistent.** La palette verrouillée de
   `tailwind.config.ts` (`nuit`, `laiton`, `creme`, `encre`) sert encore
   `/mentions-legales`, `/confidentialite` et les pages `/concept-*` via le
   pied de page partagé ; `/`, `/lp/*`, `/simulateur` et `/dossier` emploient
   des hexadécimaux « fintech clair » écrits en dur dans les composants.
   **Tant que ce n'est pas tranché, aucune de ces couleurs ne peut être
   centralisée en jetons.**
2. **Deux familles de rayons de bordure.** La configuration impose 2 px ; les
   landings et le simulateur emploient 12 à 24 px en dur.
3. **L'échelle typographique n'est pas définie comme un système.** Les tailles
   sont choisies au cas par cas. J'ai pu ajouter un palier tablette sur le
   titre du hero uniquement parce que la taille employée existait déjà dans le
   fichier ; généraliser un palier tablette à l'ensemble des titres suppose une
   échelle décidée.
4. **La rupture visuelle entre landing et simulateur** est désormais réduite
   côté structure — mêmes largeurs nommées, même rythme vertical, mêmes
   hauteurs de boutons et de champs. **Ce qui reste tient aux couleurs et aux
   rayons**, donc à l'arbitrage.
5. **Les ombres** (`shadow-xl` sur la carte de diagnostic, `shadow-lg` au
   survol des CTA) n'ont pas été harmonisées.

---

## 8. Ce que je n'ai pas pu vérifier

- **WebKit / Safari iOS réel.** Le moteur n'est pas installé dans cet
  environnement : toutes les mesures mobiles sont faites en émulation iPhone
  sur Chromium. Cela valide le balisage, les dimensions, le parcours et les
  métriques, **mais pas le rendu propre à Safari**. Un passage sur un iPhone
  réel reste nécessaire avant la campagne.
- **Les pièges mobiles annoncés au §3.3 du brief se sont révélés sans objet** :
  le zoom utilisateur n'est pas bloqué (la balise viewport ne contient ni
  `maximum-scale` ni `user-scalable=no`), aucune route de production n'emploie
  `100vh` ou `h-screen` (uniquement les pages `/concept-*`), et les deux
  en-têtes collants n'ont pas besoin de `safe-area-inset` puisque la page ne
  demande pas `viewport-fit=cover`. Rien à corriger, donc, mais c'est vérifié
  et non supposé.
- **Les pages `/concept-a`, `/concept-b`, `/concept-c`** n'ont pas été
  traitées : ce sont des maquettes de travail, hors des routes de production.
  Elles contiennent `h-screen` et des `@keyframes` sans garde de mouvement
  réduit. À supprimer ou à traiter dans une session ultérieure.

---

## 9. Réponses aux trois questions du brief

**1. L'échelle de points de rupture recommandée, et pourquoi celle-là.**
L'échelle standard de Tailwind, sans ajout. Le problème n'était pas le manque
de paliers mais le fait qu'un seul, 768, servait à la fois de seuil tablette et
de seuil desktop. Dédoubler ce seuil en `md:` (tablette) et `lg:` (desktop)
résout le cas signalé par le client sans introduire de configuration
sur mesure, donc sans dette pour le designer qui interviendra après.

**2. Un endroit où mise en page et charte sont trop imbriquées ?**
Oui, un seul, et il n'a pas empêché de travailler : les couleurs sont écrites
en dur dans les mêmes chaînes de classes que l'espacement
(`px-6 py-3 bg-[#0B0D12]`). Modifier un padding revient donc à éditer une
chaîne qui contient aussi une couleur. Le risque est d'inattention, pas de
structure : aucune des modifications de cette session n'a eu besoin de toucher
une valeur de charte. La vraie imbrication est ailleurs, et elle est listée au
§7 : tant que la charte n'est pas tranchée, ces couleurs ne peuvent pas être
extraites en jetons — ce qui est précisément le travail à faire ensuite.

**3. Les animations posent-elles un problème non anticipé ?**
Oui, deux, tous deux corrigés. Le brief anticipait des animations ajoutées sans
garde de mouvement réduit : il n'y en avait pas. Les vrais problèmes étaient
ailleurs — des animations portant sur `width`, donc sur une propriété qui force
un recalcul de mise en page, et surtout **mes propres squelettes
d'hydratation**, plus courts que le contenu, qui produisaient un décalage de
0,156 au moment exact du clic. C'est le défaut le plus coûteux de la session,
et il ne figurait dans aucune des deux listes.
