# Rapport de maintenance — site + simulateur RD Portage

Session du 15/09/2026 · branche `claude/new-session-xtn0ey`
Périmètre : maintenance corrective (§3), structure & robustesse (§4), emailing
transactionnel (§5), tests (§7).

---

## 0. Résumé

Les sept bugs sont corrigés. Les trois scénarios de recette du client passent,
rejoués à la lettre dans un navigateur, dont un en émulation iPhone.

| | Bug | État | Vérifié par |
|---|---|---|---|
| BUG-01 | Retour arrière destructif | Corrigé | recette sc. 2 · `state.test.ts`, `persistence.test.ts` |
| BUG-02 | TJM exact inaccessible / résultat à 0 € | Corrigé | recette sc. 1 · `state.test.ts`, `guards.test.ts`, `ir.test.ts` |
| BUG-03 | Étapes manquantes en seconde simulation | Corrigé | recette sc. 2 · `state.test.ts` |
| BUG-04 | « Avantages inclus » persistant | Corrigé | recette sc. 2 · `guards.test.ts`, `templates.test.ts` |
| BUG-05 | Saisie du TJM à la molette sur mobile | Corrigé | recette sc. 3 (émulation iPhone) |
| BUG-06 | « Télécharger le dossier » sans effet | Corrigé, par un dossier web | recette sc. 3 · `token.test.ts` |
| BUG-07 | Aucun email | Corrigé | `templates.test.ts` + `send.test.ts` (39 tests) |

Tests : **28 → 112**, tous au vert. Build de production : vert.
Aucune régression : les routes existantes répondent toutes 200.

Répartition des 112 tests : moteur fiscal 27 (dont le cas de référence §7.2, qui
n'était pas couvert), machine à états 8, persistance 12, invariant anti-zéro et
avantages 13, emailing 39, lien de dossier 5, tracking 8.

**Trois points demandent votre arbitrage** — ils sont au §6 : le déclencheur
réel des emails E3/E4, la persistance des leads, et le fait que le clic
« Diagnostic 30 min » serve aujourd'hui de signal d'inscription.

---

## 1. Les sept bugs

### BUG-01 — Le retour en arrière faisait perdre les informations saisies

**Cause racine.** `components/simulator/Simulator.tsx:107` — l'intégralité du
parcours vivait dans des `useState` d'un composant de 820 lignes, et l'étape
courante n'était **pas dans l'URL**. Un utilisateur qui utilisait le bouton
retour du navigateur — ou, sur mobile, le geste de retour système — quittait
purement et simplement le simulateur. Un autosave existait bien
(`Simulator.tsx:120-137`) mais il sauvegardait sans jamais garantir la
cohérence entre l'étape restaurée et les réponses.

**Correctif.** L'état est centralisé dans un store typé, et l'étape est portée
par l'URL (`/simulateur?step=foyer`). Chaque étape est une entrée
d'historique : le retour natif du navigateur et le bouton « Retour » de
l'interface font désormais strictement la même chose. L'autosave est versionné,
avec un TTL de 7 jours et une tolérance de schéma.

**Fichiers.** `lib/simulateur/state.ts`, `store.tsx`, `persistence.ts`,
`components/simulator/Simulator.tsx`.

**Vérifier en 30 s.** Ouvrir `/simulateur`, remplir profil + activité + foyer,
appuyer trois fois sur le bouton retour du navigateur, puis ravancer : tout est
pré-rempli. Rafraîchir la page : tout est encore là.

---

### BUG-02 — TJM exact inaccessible au retour arrière → résultat à 0 €

Deux défauts distincts, tous deux corrigés.

#### 2a — Le mode de saisie du TJM n'était pas restitué

**Cause racine.** Le simulateur ne connaissait **aucune notion de fourchette** :
`FormState.tjm` était un simple nombre. Les fourchettes n'existaient que dans le
diagnostic flash de l'accueil et des landings
(`components/lp/FlashDiagnostic.tsx:38`, `components/landing/HeroDiagnostic.tsx:27`
— le même tableau, dupliqué), et ce diagnostic **ne transmettait rien** au
simulateur : son lien de sortie ne portait aucun paramètre. Un utilisateur qui
revenait en arrière depuis le simulateur retombait donc sur la landing, où le
seul choix de TJM est une fourchette — d'où « il n'avait plus accès à la saisie
du TJM exact ».

**Correctif.** Le mode de saisie devient un état explicite et mémorisé :
`tjmMode: "exact" | "fourchette"`. Les deux saisies coexistent en permanence et
sont conservées séparément (`tjmExact` et `tjmBracketId`), si bien que basculer
d'un mode à l'autre ne détruit jamais l'autre valeur. Passer d'exact à
fourchette pré-sélectionne la fourchette qui contient la valeur saisie ;
l'inverse réamorce le champ avec la médiane. Le basculement est offert sur
l'écran Activité **et** rappelé sur l'écran de résultats. Les fourchettes sont
désormais définies une seule fois (`lib/simulateur/brackets.ts`).

#### 2b — Une fourchette produisait 0 €

**Cause racine.** `lib/fiscal/scenarios.ts:217` —
`Math.max(optimise.disposable - actuel.disposable, 0)`. À revenu égal, la
micro-entreprise reste plus favorable que le portage : l'écart est négatif, et
cet écrêtage le transformait en un « 0 € » affiché sans la moindre explication.

Ce n'était pas un cas limite. Mesuré sur les 20 combinaisons profil × fourchette :

| Profil | 300 € | 425 € | 575 € | 700 € |
|---|---|---|---|---|
| Salarié ESN | 1 819 € | 3 135 € | 4 788 € | 4 205 € |
| **Freelance micro** | **0 €** | **0 €** | **0 €** | **0 €** |
| Freelance SASU | 10 672 € | 13 597 € | 13 448 € | 13 324 € |
| Porté ailleurs | 11 154 € | 14 669 € | 15 227 € | 15 693 € |
| **En transition** | **0 €** | **0 €** | **0 €** | **0 €** |

`freelance_micro` est le **profil par défaut** du formulaire et le **premier de
la liste** à l'écran. Le chemin le plus fréquent du simulateur affichait donc
« Vous laissez 0 € par an sur la table ».

**Correctif (arbitrage client du 15/09).** L'écrêtage est supprimé : l'écart est
rendu tel quel, signe compris. Un écart négatif est annoncé pour ce qu'il est —
« à revenu égal, votre statut actuel vous laisse X € de plus » — et mis en
regard de ce que le portage apporte en contrepartie (statut de salarié,
assurance chômage, retraite et prévoyance, congés payés, sécurité juridique du
contrat). **Aucun barème, aucun taux et aucune cascade de calcul n'a été
modifié** : seul l'écrêtage disparaît. `economieRange` ordonne désormais ses
bornes explicitement, puisqu'avec un écart négatif ×1,15 est la borne basse.

S'y ajoute l'invariant anti-zéro du §4.2 : si les entrées ne permettent pas un
calcul crédible, l'écran n'affiche **aucun** chiffre — il nomme ce qui manque et
propose un bouton de retour vers l'étape concernée.

**Fichiers.** `lib/fiscal/scenarios.ts`, `lib/simulateur/state.ts`,
`brackets.ts`, `guards.ts`, `components/simulator/steps/ActiviteStep.tsx`,
`ResultatsStep.tsx`.

**Vérifier en 30 s.** Saisir un TJM exact de 640 €, avancer jusqu'aux
résultats, revenir en arrière : le champ exact est là, à 640. Basculer en
fourchette puis revenir en exact : 640 est toujours là. Choisir « Consultant
freelance » + n'importe quelle fourchette : le résultat n'est plus « 0 € », il
explique l'écart réel.

---

### BUG-03 — Seconde simulation : des étapes ne s'affichaient plus

**Cause racine.** `components/simulator/Simulator.tsx:126` — au chargement,
l'autosave restaurait l'étape enregistrée :
`setStep(Math.min(Math.max(saved.step, 0), 3))`. Un utilisateur ayant terminé
une simulation était donc ramené **directement à l'écran de résultats**, et
comme **aucun bouton de réinitialisation n'existait nulle part dans
l'interface**, il ne revoyait jamais Activité ni Foyer. C'est très exactement
« certaines étapes (activité / foyer) ne s'affichent plus ».

**Correctif.** Un bouton « Nouvelle simulation » explicite, présent sur l'écran
de résultats, sur l'écran d'inscription et en pied de parcours : il purge
l'intégralité de l'état — formulaire, étape, déverrouillage, identifiant de
simulation — et rejoue le parcours depuis l'étape 1. Son pendant « Modifier ma
simulation » fait l'inverse : retour à l'étape voulue **avec les valeurs
conservées** (§4.4).

**Fichiers.** `lib/simulateur/state.ts` (action `reset`), `store.tsx`,
`components/simulator/steps/ResultatsStep.tsx`, `InscriptionStep.tsx`,
`Simulator.tsx`.

**Vérifier en 30 s.** Terminer une simulation, cliquer « Nouvelle
simulation » : retour à l'étape 1, formulaire vierge. Enchaîner trois
simulations avec des profils différents dans le même onglet : les quatre étapes
s'affichent à chaque fois, sans valeur fantôme.

---

### BUG-04 — « Avantages inclus » persistait après désélection

**Cause racine.** Deux endroits, tous deux en dur :

1. `components/simulator/Simulator.tsx:407` — la mention était une **chaîne de
   caractères écrite en dur** sous le chiffre : `Avantages inclus. Le détail
   foyer […]`. Elle ne lisait strictement rien de l'état, donc elle ne pouvait
   pas disparaître.
2. `components/simulator/Simulator.tsx:150` — `computePortage` était appelé avec
   `mealVouchers: true`, également en dur : les titres-restaurant étaient
   toujours comptés dans le net perçu, quelle que soit la sélection.

L'affichage et le calcul ne lisaient donc effectivement pas la même source de
vérité, comme vous l'aviez pressenti.

**Correctif.** La mention, le montant du net perçu et le détail du calcul
descendent tous de `useSimulation()`. La mention est dérivée d'un seul champ,
`avantages.avantagesInclus`, lui-même dérivé de la sélection réelle. Les
titres-restaurant deviennent une option explicite de l'état (`form.titresResto`)
et sont comptés comme un avantage à part entière. Quand rien n'est retenu, la
mention devient « Sans avantages » et le net perçu est recalculé sans eux.

**Point de vigilance métier — vérifié.** Les cagnottes sont bien affichées
**nettes de frais de service**. `cagnotteNet()` applique correctement les
conditions Wawashi (60 €/an + 3,5 %) : 1 500 € brut → **1 443 € net/mois**. May
est à frais nuls dans la configuration actuelle. Un test verrouille ce calcul.

**Fichiers.** `lib/simulateur/payload.ts` (`buildAvantages`),
`useSimulation.ts`, `components/simulator/steps/ActiviteStep.tsx`.

**Vérifier en 30 s.** Sur l'écran Activité, noter le net perçu, puis choisir
« Aucune » et décocher « Titres-restaurant » : la mention passe à « Sans
avantages » et le montant change dans la même seconde. Mesuré :
May + titres-resto 4 623 € → aucun avantage 5 353 €.

---

### BUG-05 — Mobile : la saisie du TJM obligeait à utiliser la molette

**Cause racine.** `components/simulator/Simulator.tsx:728` — tous les champs de
montant étaient des `<input type="number">`. C'est précisément ce type qui
déclenche le comportement spinner/molette signalé sur iPhone. Par-dessus, le
curseur était le moyen de saisie principal et le champ n'occupait que 96 px de
large, à droite du curseur.

**Correctif.** Un composant unique `AmountInput` remplace tous les champs de
montant du parcours :

- `type="text"` + `inputMode="numeric"` + `pattern` → clavier numérique natif
  iOS et Android, **sans spinner ni molette** ;
- `font-size: 16px` strict sur tous les champs → pas de zoom automatique iOS à
  la focalisation ;
- cibles tactiles à 48 px de haut (seuil requis : 44) ;
- le curseur devient un moyen d'ajustement **complémentaire**, placé sous le
  champ, jamais le seul moyen de saisie ;
- la saisie tolère les formats réels : « 640 », « 640 € », « 1 200 », « 1.200 ».

**Correctif annexe.** Les `<label>` du parcours n'étaient associés à aucun
champ : décoratifs pour un lecteur d'écran, invisibles pour le remplissage
automatique iOS, et taper dessus ne donnait pas le focus. Ils portent
désormais un `htmlFor` réel.

**Fichiers.** `components/simulator/ui.tsx`, tous les écrans de `steps/`.

**Vérifier en 30 s.** Sur iPhone, ouvrir `/simulateur`, choisir un profil,
taper dans le champ TJM : le pavé numérique s'ouvre, aucun spinner n'apparaît,
la page ne zoome pas. Mesuré en émulation iPhone 13 : « 640 » saisi en 161 ms,
champ `type=text`, `inputmode=numeric`, police 16 px, cible 48 px.

---

### BUG-06 — Mobile : le bouton « Télécharger le dossier » ne fonctionnait pas

**Cause racine — c'était bien le plus opaque des sept.**
`components/simulator/Simulator.tsx:588` — le bouton appelait `window.print()`,
et **rien d'autre**. Il n'existait **aucune génération de document**, ni côté
client ni côté serveur : pas de bibliothèque PDF, pas de route d'export, rien.
Sur Safari iOS, `window.print()` est ignoré sans le moindre retour visible.
D'où un bouton qui « ne fonctionne pas », en silence — et découvert par un
utilisateur du client plutôt que par nous, ce qui est exactement le problème
d'observabilité pointé au §4.5.

Aucune des autres pistes du brief n'était en cause : il n'y avait ni `blob:`,
ni `data:` URL, ni `<a download>`, ni ouverture d'onglet — il n'y avait rien.

**Correctif (arbitrage client du 15/09 : abandonner le PDF).** Le bouton devient
un lien vers **`/dossier`**, une page web. Une page n'a rien à télécharger, rien
qu'un bloqueur de pop-up ou une politique Safari puisse refuser, et le même lien
s'ouvre depuis l'email sur n'importe quel appareil — ce qu'un PDF joint ne
garantit pas.

Le dossier présente, à partir du seul contrat de données : la cascade du CA HT
au net perçu, la part du CA réellement restituée, les avantages nets de frais,
les trois scénarios comparés, le foyer et l'impôt. Tailwind pour la mise en
page, GSAP pour les révélations, et un accent Three.js discret — les trois
étaient déjà dans le projet, aucune dépendance lourde ajoutée.

**Deux chemins d'accès, jamais d'écran vide :**

1. **lien signé** (`/dossier?d=…&s=…`), celui qui part dans l'email : le
   récapitulatif est compressé et signé (HMAC) dans l'URL elle-même ;
2. **sans lien** : reconstruction depuis la simulation enregistrée localement ;
3. **à défaut** : un message explicite et un retour au simulateur.

Le choix du lien signé plutôt qu'un identifiant en base est délibéré : le
stockage des leads n'est aujourd'hui **pas durable** (voir §6.2), et introduire
une base de données sans votre arbitrage aurait dépassé le périmètre. Le lien
reste valable quoi qu'il arrive au stockage, et pourra être remplacé par un
identifiant court le jour où une base existera.

**Prudence délibérée sur la 3D.** C'est une génération client trop lourde qui
faisait échouer l'ancien bouton sur Safari iOS ; on ne refait pas la même
erreur. WebGL est sondé **avant** tout téléchargement de Three.js, l'accent est
ignoré sous 640 px de large et en mouvement réduit, l'animation se met en pause
hors écran, et toute erreur est avalée : si l'accent ne se charge pas, le
dossier s'affiche intégralement sans lui. L'impression navigateur reste offerte
en complément, jamais comme seul moyen d'accès.

**Fichiers.** `app/dossier/page.tsx`, `components/dossier/*`,
`lib/dossier/token.ts`, `components/simulator/steps/InscriptionStep.tsx`.

**Vérifier en 30 s.** Terminer une inscription sur iPhone, cliquer « Ouvrir mon
dossier » : la page s'ouvre. Copier le lien reçu par email et l'ouvrir sur un
autre appareil : le même dossier s'affiche.

---

### BUG-07 — Aucun email de récapitulatif ni de confirmation

**Constat.** Ce n'était effectivement pas un bug : **aucune ligne de code
n'envoyait d'email**. Les six emails de la séquence J0→J14 existaient en HTML
dans `content/emails/`, mais rien ne les expédiait, et aucun SDK d'emailing
n'était installé.

**Correctif.** Quatre envois, conformes au tableau §5.1 :

| | Déclencheur | Destinataire | Contenu |
|---|---|---|---|
| E1 | Soumission du lead gate | l'utilisateur | Récapitulatif + lien vers le dossier |
| E2 | Chaque E1 | `MAIL_INTERNAL_TO` | Copie intégrale de E1, avec bandeau d'identification |
| E3 | Engagement post-inscription | l'utilisateur | Confirmation + prochaines étapes |
| E4 | Chaque E3 | `MAIL_INTERNAL_TO` | Coordonnées + données clés de la simulation |

**E2 et E4 sont des envois séparés, pas des copies cachées** : filtrables dans
votre boîte, et ils partent **même si l'envoi au lead échoue** — les deux
promesses sont lancées ensemble et attendues indépendamment, aucune ne
conditionne l'autre. Un test verrouille précisément ce comportement.

**Garanties.** Envoi exclusivement côté serveur ; clé en variable
d'environnement, jamais exposée au navigateur ni écrite en dur ; **idempotence**
portée par une clé stable par simulation et par destinataire, transmise à Resend
qui dédoublonne côté serveur — ce qui tient même entre deux invocations
serverless distinctes, donc un double-clic, un retry réseau ou un re-rendu ne
peuvent pas produire deux emails ; **non bloquant** — aucune fonction ne lève,
un échec est journalisé et le lead reste enregistré, le dossier reste
accessible ; **retry** de deux tentatives avec backoff sur erreur transitoire
uniquement (une adresse invalide n'est jamais réessayée) ; **RGPD** — envoi
après consentement, usage des données rappelé, lien vers la politique de
confidentialité, emplacement de désinscription prévu.

Le récapitulatif est **recalculé côté serveur** à partir du formulaire : les
montants envoyés par le navigateur ne font jamais autorité. C'est ce qui
garantit que l'email, le dossier et l'écran affichent les mêmes chiffres.

**Sans `RESEND_API_KEY`, les envois passent en mode simulé** et sont tracés dans
les logs : le parcours reste testable de bout en bout avant même la mise en
place du DNS.

**Fichiers.** `lib/email/*`, `app/api/lead/route.ts`,
`app/api/inscription/route.ts`.

**Vérifier en 30 s.** Renseigner `RESEND_API_KEY` et `MAIL_INTERNAL_TO`,
terminer une simulation avec une vraie adresse : le récapitulatif arrive, et sa
copie arrive sur l'adresse interne, en deux emails distincts.

---

## 2. Changements de structure, et pourquoi

Vous aviez raison au §4 : les bugs 01, 02 et 03 partageaient la même cause
racine. Ils n'ont pas été rustinés un par un.

**Avant.** Un composant de 820 lignes portait l'état, la navigation, les
calculs et tout le rendu. L'étape n'était pas dans l'URL. L'autosave restaurait
une étape sans qu'aucun chemin ne permette de repartir de zéro. Les libellés
étaient écrits en dur à côté des chiffres qu'ils étaient censés décrire.

**Après.**

| Module | Rôle |
|---|---|
| `types/simulation-result.ts` | Le contrat de données (§3 ci-dessous) |
| `lib/simulateur/state.ts` | Formulaire typé, étapes nommées, reducer pur |
| `lib/simulateur/store.tsx` | Provider unique, étape portée par l'URL |
| `lib/simulateur/persistence.ts` | Autosave versionné, TTL 7 j, tolérance de schéma |
| `lib/simulateur/guards.ts` | Invariant anti-zéro et contrôle de plausibilité |
| `lib/simulateur/payload.ts` | Construction du récapitulatif, pure et partagée serveur/client |
| `lib/simulateur/useSimulation.ts` | Tous les dérivés d'affichage |
| `lib/simulateur/brackets.ts` | Fourchettes de TJM, source unique |
| `components/simulator/steps/*` | Un écran par étape, tous lisant le store |

**Ce que cela garantit structurellement.** L'étape dans l'URL rend le retour
natif équivalent au bouton de l'interface (BUG-01). Le mode de saisie du TJM est
un état, donc restituable (BUG-02). La réinitialisation est une action du
reducer, donc totale (BUG-03). Les libellés sont dérivés, donc ils ne peuvent
plus mentir (BUG-04).

**Observabilité (§4.5).** Les résultats non plausibles sont journalisés en
console structurée côté navigateur et dans les logs serveur, avec leur contexte.
Les échecs d'envoi d'email le sont aussi, avec le destinataire et la clé
d'idempotence. Plus rien ne doit échouer en silence comme l'a fait BUG-06.

**Le parcours n'a pas changé.** Conformément au §6, aucune étape n'a été
ajoutée : le choix des avantages reste dans l'étape Activité, où il se trouvait
déjà, simplement retitré « Choix des avantages » pour correspondre à la façon
dont vous le désignez.

---

## 3. Contrat de données du récapitulatif (§5.3)

Écrit dans **`types/simulation-result.ts`**, version `simulation_result_v1`.
C'est le contrat sur lequel vous concevrez le visuel : les emails, le dossier et
l'écran de résultats le consomment tous, et lui seul.

```
SimulationResultPayload
├─ version
├─ identite    : prenom, email, telephone?, profil, profilLabel
├─ activite    : tjm, tjmMode (exact|fourchette), tjmFourchette?{id,label,min,max,mediane},
│                joursFactures, joursFacturesAnnuels, fraisProMensuels
├─ foyer       : situation, situationLabel, nombreDeParts, enfants,
│                enfantsGardeAlternee, revenuConjoint, modeDeduction,
│                modeDeductionLabel, fraisReelsAnnuels, per,
│                autresRevenus{foncier, dons}
├─ avantages   : selection[]{id,label,montantBrutMensuel,montantNetMensuel,
│                            montantNetAnnuel,fraisDeService},
│                totalNetMensuel, totalNetAnnuel,
│                titresResto{inclus,creditMensuel}, avantagesInclus
├─ resultats   : mensuel{caHt, fraisDeGestion, assurancesTaxes, fraisPro,
│                        cagnotte, disponible, brut, cotisationsSalariales,
│                        netVerse, titresResto, percuNet, remunerationGlobale},
│                tauxRestitution, netImposableAnnuel, impotNet,
│                tauxMoyenImposition, tmi, scenarios[3],
│                laisseSurLaTable, laisseSurLaTableSens
└─ meta        : simulationId, dateSimulation, dateSimulationLabel,
                 source{utm*, leadSource, device}, mentions{...}, dossierUrl?
```

**Conventions, pour que votre gabarit n'ait rien à deviner.** Tous les montants
sont en euros, arrondis à l'unité. Tous les taux sont des **ratios**
(`0.412` = 41,2 %), jamais des pourcentages déjà multipliés. Chaque valeur
technique est doublée d'un libellé prêt à afficher (`profilLabel`,
`situationLabel`, `modeDeductionLabel`, `dateSimulationLabel`).

**Quatre points d'attention que vous m'aviez demandé de signaler :**

1. **`laisseSurLaTable` peut être négatif.** C'est la conséquence directe de
   l'arbitrage sur BUG-02. Le champ `laisseSurLaTableSens`
   (`"gain" | "perte" | "neutre"`) donne la lecture prête à l'emploi : votre
   gabarit doit prévoir les deux cas, pas seulement le cas gagnant.
2. **`avantages.avantagesInclus` est le seul champ autorisé à piloter la mention
   « avantages inclus ».** C'est l'invariant qui empêche BUG-04 de réapparaître.
   Merci de ne pas le recalculer autrement dans le gabarit.
3. **Les montants d'avantages sont nets de frais de service**, et
   `fraisDeService` porte le libellé en clair (« 60 €/an + 3,5 % ») pour que le
   visuel puisse le montrer sans le recomposer.
4. **`tjmFourchette` n'est renseigné qu'en mode fourchette.** Il porte les bornes
   *et* la médiane, pour que le récapitulatif puisse écrire « fourchette
   350–500 € (calcul sur 425 €) » plutôt qu'un chiffre sec.

**Contraintes des gabarits email, déjà respectées** : tableaux et non
flex/grid, CSS strictement inline, largeur 600 px, aucun script ni feuille de
style externe, version texte brut fournie pour chaque envoi, données
utilisateur échappées. Cinq tests par email verrouillent ces contraintes — le
design pourra changer sans les casser.

---

## 4. Enregistrements DNS à faire poser pour Resend (§5.5)

À transmettre à Linda pour le domaine **`rdportage.com`**.

| # | Type | Nom / Hôte | Valeur | Priorité |
|---|---|---|---|---|
| 1 | MX | `send` | `feedback-smtp.<région>.amazonses.com` | 10 |
| 2 | TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |
| 3 | TXT | `resend._domainkey` | `p=…` **(à copier depuis Resend)** | — |
| 4 | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:marketing@rdportage.com` | — |

**À savoir avant de transmettre :**

- **Les noms d'hôtes sont à saisir tels quels** (`send`, `resend._domainkey`),
  **sans y ajouter `rdportage.com`** : l'hébergeur DNS complète le domaine
  lui-même. C'est l'erreur de pose la plus fréquente.
- **La `<région>` de l'enregistrement 1 dépend de la région choisie dans Resend
  au moment d'ajouter le domaine.** Pour une société française, choisir
  **`eu-west-1`** (Irlande) : les données restent dans l'UE, ce qui simplifie le
  volet RGPD. La valeur devient alors
  `feedback-smtp.eu-west-1.amazonses.com`.
- **La valeur DKIM (`p=…`) est générée par Resend, unique à votre domaine.** Je
  ne peux pas l'inventer : il faut ajouter le domaine dans Resend
  (Domains → Add Domain → `rdportage.com`), puis recopier la valeur affichée.
- L'enregistrement 4 (DMARC) n'est pas exigé par Resend mais fortement
  recommandé : `p=none` observe sans rien bloquer, et les rapports arrivent sur
  l'adresse indiquée. À durcir en `p=quarantine` une fois les envois stabilisés.
- Compter **jusqu'à 72 h** de propagation, généralement moins d'une heure.

**En attendant, les tests peuvent commencer immédiatement.** L'expéditeur de
repli est le domaine de test Resend (`onboarding@resend.dev`), déjà actif sans
aucun DNS. La bascule vers `marketing@rdportage.com` se fait en changeant **une
seule variable d'environnement**, `MAIL_FROM`, sans redéploiement de code.

Limite du domaine de test à connaître : `onboarding@resend.dev` n'envoie que
vers l'adresse du titulaire du compte Resend. Pour tester vers d'autres
adresses, il faut le domaine vérifié.

---

## 5. Variables d'environnement ajoutées

`.env.example` est à jour. Les cinq nouvelles :

| Variable | Rôle | Obligatoire |
|---|---|---|
| `RESEND_API_KEY` | Clé API Resend, serveur uniquement | Pour envoyer réellement |
| `MAIL_FROM` | Expéditeur. Repli : `RD Portage <onboarding@resend.dev>` | Non (repli intégré) |
| `MAIL_INTERNAL_TO` | Destinataire des copies E2/E4 — `marketing@rdportage.com` | Pour recevoir les copies |
| `DOSSIER_SECRET` | Signature HMAC des liens de dossier. `openssl rand -hex 32` | **Oui en production** |
| `NEXT_PUBLIC_SITE_URL` | URL publique, pour les liens des emails | Non (déduite des en-têtes) |

Sans `RESEND_API_KEY`, tout fonctionne en mode simulé. Sans `DOSSIER_SECRET` en
production, un avertissement est journalisé et un secret de développement est
utilisé — à ne pas laisser en l'état.

---

## 6. Ce qui demande votre arbitrage, et ce que je n'ai pas corrigé

### 6.1 — Le déclencheur réel des emails E3 / E4

**Le constat.** Le tunnel déployé ne comporte qu'**un seul point de
soumission** : le lead gate du simulateur. « Fin de simulation + email
renseigné » et « finalisation de l'inscription » y sont donc **le même
instant**. Envoyer E1, E2, E3 et E4 d'un coup aurait produit quatre emails
simultanés pour un seul geste — l'inverse de ce que vous cherchez.

**Ce que j'ai fait.** E1/E2 partent à la soumission du lead gate, ce qui répond
à votre première remontée. E3/E4 sont **entièrement implémentés et testés**,
exposés sur `/api/inscription`, et déclenchés par l'engagement explicite qui
suit le lead gate : le clic sur « Valider ce chiffre — Diagnostic 30 min », qui
est le moment où le lead devient commercialement actionnable.

**Ce que je vous demande.** Est-ce le bon déclencheur ? Deux alternatives, l'une
comme l'autre à un appel de fonction près :
(a) une véritable étape d'inscription distincte, à créer — ce que le §6 du brief
m'interdisait de faire seul ;
(b) un déclenchement depuis le CRM, quand Linda qualifie le lead.

**Conséquence si on ne tranche pas :** un lead qui s'inscrit sans jamais cliquer
sur le CTA Diagnostic reçoit son récapitulatif (E1) mais pas sa confirmation
(E3), et vous ne recevez pas la notification E4.

### 6.2 — Persistance des leads : le constat que vous m'aviez demandé de faire

**C'est le point le plus sérieux du rapport.**

`CRM_PROVIDER` vaut `mock` par défaut. L'adaptateur mock
(`lib/crm/mock.ts:11`) stocke les leads dans **une `Map` en mémoire**, doublée
d'un journal NDJSON écrit sur le disque local (`lib/crm/journal.ts`).

**Sur Vercel, les deux sont perdus.** Chaque invocation serverless part d'un
processus neuf : la `Map` est vide à chaque requête, et le système de fichiers
est éphémère. Le fichier `lib/crm/journal.ts:6` le documente d'ailleurs
lui-même. Le commentaire de `mock.ts` annonce que « tout le tunnel est testable
sans clé » — c'est vrai en local, faux en production.

**Concrètement : si aucune clé Brevo ou Airtable n'est configurée aujourd'hui en
production, aucun lead n'est conservé nulle part.** Les emails E2/E4 que je
viens de brancher deviennent, de fait, votre seule trace d'un lead entrant.
C'est mieux que rien — c'était d'ailleurs l'objet de votre demande du 08/09 —
mais un email n'est pas un stockage.

**Ma recommandation, par ordre de coût croissant :**

1. **Immédiat, gratuit** : renseigner `CRM_PROVIDER=airtable` avec
   `AIRTABLE_API_KEY` et `AIRTABLE_BASE_ID`. L'adaptateur existe déjà
   (`lib/crm/airtable.ts`), il est écrit et prêt — il n'attend que les clés.
   C'est une durabilité réelle pour un coût nul et zéro développement.
2. **Recommandé à terme** : une vraie table (Vercel Postgres, Supabase, Neon).
   Cela permettrait aussi de raccourcir les liens de dossier et d'en révoquer.
3. **À ne pas faire** : rester en `mock` en production.

Je n'ai rien construit de lourd ici, conformément à votre consigne. La décision
vous revient.

### 6.3 — La formule de comparaison micro-entreprise

Corrigé selon votre arbitrage (l'écrêtage est supprimé), mais je veux être
explicite sur ce que cela révèle, car cela dépasse le code.

Le simulateur montre désormais, sans ambiguïté, qu'**à revenu égal un
micro-entrepreneur perd de l'argent en passant au portage**. C'est
arithmétiquement exact avec les hypothèses actuelles (`MICRO_BNC_2026` :
abattement 34 %, cotisations ~22 %, contre ~45 % patronal + 21,5 % salarial en
portage). Ce n'est pas un bug de calcul.

Deux questions qui vous appartiennent, et que je n'ai pas tranchées :

1. **Le message commercial.** Le simulateur dira à un micro-entrepreneur que son
   statut actuel est plus rentable. J'ai rédigé la contrepartie (protection
   sociale, chômage, retraite, prévoyance, congés payés, sécurité juridique) —
   **ce texte est à relire et à valider par vous**, il est commercialement
   sensible et c'est vous qui connaissez votre discours.
2. **Le périmètre de la comparaison.** La comparaison actuelle porte sur le
   disponible net. Elle ignore structurellement ce que le portage apporte et que
   la micro n'a pas. Une comparaison « à protection sociale équivalente »
   (micro + mutuelle + prévoyance + retraite complémentaire + provision chômage)
   donnerait un résultat très différent, et sans doute plus juste. C'est un
   changement de fond que je n'ai pas fait sans vous.

### 6.4 — Ce que je n'ai pas pu vérifier

- **Safari iOS réel.** L'environnement de cette session ne dispose que de
  Chromium ; WebKit n'y est pas installé. La recette mobile a donc tourné en
  **émulation iPhone 13 sur Chromium**, ce qui valide le balisage, les tailles
  et le parcours, mais **pas le comportement propre au moteur WebKit**. Les
  correctifs de BUG-05 et BUG-06 sont précisément ceux qui suppriment les
  dépendances au comportement Safari (plus de `type=number`, plus de
  `window.print()` comme seul chemin), mais **un passage sur un iPhone réel
  reste à faire de votre côté** avant de lancer la campagne.
- **Un envoi Resend réel.** Aucune clé API n'était disponible. Les quatre emails
  sont couverts par 39 tests (contenu, compatibilité clients mail, RGPD,
  idempotence, envois séparés), mais le premier envoi réel reste à faire avec la
  clé.
- **Le déploiement en production.** Je n'ai pas d'accès Vercel : la branche est
  poussée, le déploiement suit votre circuit habituel.

---

## 7. Bugs découverts en chemin — signalés, non corrigés

Conformément au §2 : notés, pas corrigés en silence.

1. **`/merci` est une page orpheline.** Aucun lien du site n'y mène
   (`app/merci/page.tsx`). Elle contient pourtant la logique de déduplication du
   Pixel Meta (`metaLead` depuis l'`event_id` stocké). Conséquence : cette
   déduplication ne s'exécute jamais. Sans effet sur le tunnel, mais c'est du
   code mort qui porte une fonction utile — à rebrancher ou à supprimer.

2. **Le diagnostic flash ne transmet rien au simulateur.** Ni
   `HeroDiagnostic` ni `FlashDiagnostic` ne passent les réponses au lien de
   sortie. Un utilisateur qui répond aux trois questions doit tout ressaisir.
   Ce n'est pas un bug au sens strict, mais c'est une perte de conversion à
   l'endroit le plus coûteux du tunnel — juste après l'engagement. Maintenant
   que les fourchettes sont en source unique (`lib/simulateur/brackets.ts`), le
   raccordement est devenu simple. **Je ne l'ai pas fait : cela modifie le
   comportement d'une landing en production pendant que vous testez.**

3. **`HeroDiagnostic` et `FlashDiagnostic` sont deux copies du même
   composant**, avec les mêmes questions et les mêmes barèmes, dans deux chartes
   graphiques différentes. Toute évolution des questions doit être faite deux
   fois, avec le risque de divergence que cela implique.

4. **`pdf_downloaded` reste dans les événements de tunnel** alors que plus rien
   ne l'émet. Conservé volontairement pour ne pas invalider l'historique des
   leads déjà journalisés. Remplacé par `dossier_opened`.

5. **Deux systèmes de design coexistent dans le même produit** — voir l'annexe.

---

## 8. Annexe — état du responsive (constat uniquement, aucune correction)

Mesuré au navigateur sur 11 routes × 4 largeurs (390, 400, 768, 1280 px), après
les correctifs de cette session. Données brutes reproductibles.

### 8.1 — Breakpoints et espacement

**Breakpoints réellement utilisés** : `sm:` (640 px) **21 fois**, `md:` (768 px)
**139 fois**, `lg:` / `xl:` / `2xl:` **jamais**.

Le système est donc, en pratique, **à deux états** : « mobile » et
« ≥ 768 px ». Aucun traitement intermédiaire pour la tablette, et aucune
contrainte pour les très grands écrans au-delà de `max-w-page` (1140 px).
C'est le point de départ le plus structurant de la session suivante : passer de
deux états à une échelle cohérente.

**Espacement** : échelle Tailwind par défaut, sans jeton métier. Les valeurs
sont saisies au cas par cas dans les composants (`py-8`, `px-4`, `mt-10`…), sans
rythme vertical partagé. Deux largeurs maximales cohabitent : `max-w-page`
(1140 px, défini dans la config) et `max-w-2xl` / `max-w-3xl` (Tailwind) sur le
simulateur et le dossier.

**Aucune media query CSS manuscrite** hors `@media print` et
`prefers-reduced-motion` : tout passe par Tailwind. C'est une bonne base.

### 8.2 — Deux systèmes de design coexistent

C'est le constat le plus important de cette annexe.

`tailwind.config.ts` définit une palette verrouillée et exhaustive, commentée
« Brand lock TRIBUNAL FISCAL » : `nuit #0E1B33`, `laiton #B08D57`,
`creme #F4EFE6`, `encre #1A1A1A`, `valide #2F6B4F`, avec
`borderRadius: 2px` partout et une police `display` sérif.

Mais `/lp/*`, `/simulateur` et `/dossier` n'utilisent **pas** ces jetons. Ils
emploient des couleurs hexadécimales écrites en dur dans les composants —
`#0B0D12`, `#FFF1DE`, `#E7F6EE`, `#ECEEF3`, `#7A8093` — avec des rayons de 12 à
24 px et une police sans-serif unique (la sérif ayant été retirée à votre
demande).

**Conséquence** : les pages historiques (`/`, `/merci`, `/mentions-legales`,
`/confidentialite`) et les pages de conversion (`/lp`, `/simulateur`) ne se
ressemblent pas, et le commentaire « no default Tailwind colors may appear in
the final render » n'est plus respecté. Rien de cassé fonctionnellement, mais
c'est une dette à trancher **avant** que le designer n'intervienne : il faut
décider laquelle des deux chartes est la bonne, sans quoi son travail portera
sur un socle ambigu.

### 8.3 — Débordements horizontaux

**Aucun, sur aucune route, à aucune largeur.** Mesure : `scrollWidth −
clientWidth = 0` partout, et aucun élément ne dépasse le viewport à 390 px.

### 8.4 — Cibles tactiles sous 44 px

| Élément | Taille | Où | Nature |
|---|---|---|---|
| `a` « Calculer mon vrai taux » | **190 × 40** | `/`, `/lp/*`, toutes largeurs | **CTA principal** |
| `a` « Mentions légales » | 90 × 14 | toutes les pages, pied | lien de pied |
| `a` « Confidentialité » | 76 × 14 | toutes les pages, pied | lien de pied |
| `a` « Méthode » / « Preuves » / « Tarif » | 54×20 / 51×20 / 26×20 | `/` ≥ 768 px | navigation |
| `a` « RD Portage » | 94 × 28 | `/simulateur`, en-tête | retour accueil |
| `a` « ← Retour » | 60 × 16 | `/mentions-legales`, `/confidentialite` | navigation |
| `a` « Politique de confidentialité » / « CNIL » | 139×14 / 27×14 | pages légales | liens en ligne |

**Le seul cas à traiter en priorité est le premier** : le CTA principal des
landings est à 40 px de haut, soit 4 px sous le seuil. Il reste utilisable —
c'est pourquoi il relève du cosmétique et non du fonctionnel — mais c'est le
bouton qui porte le budget média.

Les liens de pied et les liens en ligne dans du texte sont un cas classique :
l'usage admet de les laisser à la hauteur de leur ligne. À trancher à la
session suivante.

**Le simulateur et le dossier sont conformes** : toutes leurs cibles sont à
44 px minimum, c'était l'objet du correctif BUG-05.

### 8.5 — Textes sous 16 px sur les champs

**Aucun.** Plus aucun champ de saisie du site n'est sous 16 px, donc **plus
aucun zoom automatique iOS à la focalisation**. Corollaire mesuré : **plus aucun
`<input type="number">` nulle part** — le déclencheur de la molette a disparu du
produit.

### 8.6 — Fonctionnel (fait ici) vs cosmétique (session suivante)

**Traité dans cette session, parce que cela empêchait d'utiliser l'outil :**
saisie des montants au clavier numérique (BUG-05), suppression du zoom iOS,
cibles tactiles du simulateur portées à 44/48 px, association des libellés aux
champs, accès au dossier sur mobile (BUG-06), absence de débordement sur le
simulateur et le dossier.

**Laissé à la session responsive, parce que cela relève de la forme :**
le CTA principal des landings à 40 px ; les cibles de navigation et de pied de
page ; l'arbitrage entre les deux chartes graphiques (§8.2) ; l'absence de
traitement tablette entre 640 et 768 px ; l'introduction d'une échelle
d'espacement partagée ; l'unification des largeurs maximales.

---

## 9. Vérification en production (§7.3)

État constaté **avant** cette session, en navigation privée :

| Route | Code |
|---|---|
| `/` · `/simulateur` · `/lp/a` · `/lp/b` · `/lp/c` | 200 |
| `/lp/a?v=vsl` · `/lp/b?v=vsl` · `/lp/c?v=vsl` | 200 |
| `/mentions-legales` · `/confidentialite` | 200 |

**Aucune route n'est protégée par la Vercel Deployment Protection.**

Ces vérifications sont à rejouer après déploiement, avec en plus la nouvelle
route `/dossier`. Je n'ai pas d'accès Vercel : le déploiement suit votre
circuit habituel depuis la branche.
