# Références UX Mobbin : parcours simulateur → rappel (RD Portage)

**Date :** 14/10/2026
**Objet :** motifs d'interface pour qu'une personne arrivant d'Instagram (navigateur intégré, mobile) aille du diagnostic flash jusqu'au numéro de téléphone avec le moins de friction possible.

**Méthode.** Recherche dans Mobbin avec les outils `search_screens`, `search_flows` et `search_sections`, soit 24 requêtes au total. On a cherché d'abord sur iOS, puis sur le web (écrans et sections). Chaque image renvoyée a été regardée : seuls les écrans et flows réellement renvoyés sont cités, avec leur `mobbin_url` exact. Requêtes utilisées (en anglais), par thème :

- **Pages d'arrivée et calculateurs :** « salary or take-home pay calculator screen… » (iOS), « hero section of a finance or insurance landing page with an embedded calculator or quote form… » (sections), « interactive savings or earnings calculator section with a slider… » (sections), « Wise send money calculator showing fee amount… » (iOS), « fintech hero with… a short line of reassurance under the button » (sections).
- **Questionnaires :** « Lemonade insurance quote onboarding, one question per screen… » (flows iOS), « onboarding question screen with progress bar… answer tiles for employment status » (iOS), « question asking annual income with selectable income range buttons… » (iOS), « Ro web intake questionnaire in mobile browser… » (flows iOS), « Qonto account opening onboarding… » (flows iOS : Qonto n'a pas été renvoyé, Mobbin a proposé Wise et N26).
- **Résultat avant coordonnées :** « estimate result screen showing a large personalized amount or range… » (iOS), « tax refund estimator: answer a few questions, see estimated refund… » (flows iOS).
- **Téléphone et rappel :** « request a callback screen… » (iOS), « phone number input screen with… explanation of why the number is needed » (iOS), « contact form to talk to an advisor… what happens next » (sections), « schedule a free call with a financial advisor… » (flows iOS), « request submitted confirmation screen with… what happens next timeline » (iOS).
- **Cookies :** « compact cookie consent banner at the bottom… equal size » (iOS), « short privacy consent bottom sheet… » (iOS), « small cookie consent bar pinned to the bottom of a website… » (sections), « cookie banner overlay at the bottom of a landing page with two equal buttons… » (web).
- **Confiance :** « screen introducing a personal advisor or expert with their photo… » (iOS), « founder note section with founder portrait photo… » (sections), « primary call-to-action button with small reassurance text directly below… » (iOS).

**Limites.** Mobbin recense surtout des apps iOS natives et des sites web vus sur ordinateur. Ro est l'exception utile : son parcours tourne dans Safari mobile (start.ro.co), comme celui de RD Portage. Les références web sont donc à transposer à une largeur de 375 px. On a trouvé très peu de bandeaux cookies mobiles où Refuser et Accepter ont vraiment le même poids. Les requêtes « réassurance sous le bouton » et « section fondateur » ont surtout renvoyé des clauses légales ou des sections desktop.

---

## Thème 1 : pages d'arrivée de produits financiers dont l'action principale est un calcul

### 1. Lemonade Insurance : un seul bouton « voir les prix » et deux lignes de réassurance

- **Application :** Lemonade Insurance
- **Lien :** [Flow « Home »](https://mobbin.com/flows/05b81dd5-d6ab-4dff-ba61-a2c704033865)
- **Plateforme :** iOS
- **Motif observé :** L'écran « Homeowners » contient une phrase de promesse, trois pictos qui montrent ce qui est couvert et un seul bouton plein, « CHECK OUR PRICES ». Juste en dessous, deux lignes cochées : « Trusted by all major lenders » et « Starting from $25/month ». L'accueil de l'app (« Take Lemonade For A Spin! ») garde ce même bouton unique.
- **Pourquoi ça marche :** L'action principale est un calcul, pas une inscription. Les deux lignes répondent aux deux objections du moment (« est-ce sérieux ? », « combien ? ») là où le pouce se pose, sans ouvrir d'autre chemin.
- **Application chez RD Portage :** Sur le premier écran mobile, ne garder qu'une phrase (le titre repris de la pub) et une seule action. Chez RD Portage, on va un cran plus loin que Lemonade : l'action est la question 1 du diagnostic elle-même, visible sans défiler, donc zéro bouton intermédiaire. Sous les réponses, deux lignes factuelles : « 4 % de frais de gestion » et « Fourchette affichée sans laisser de coordonnées ». Aucun autre bouton ne doit concurrencer la question dans ce premier écran. « Trusted by all major lenders » est une preuve sociale : chez RD Portage, ce type de ligne ne s'utilise qu'avec un élément réel et vérifiable.

### 2. Upwork : taux, puis frais, puis ce que l'on touche

- **Application :** Upwork
- **Lien :** [Écran « Hourly rate / Service fee / You'll get »](https://mobbin.com/screens/74f3ee7b-8baa-4c08-bae3-9b27b922b0b5)
- **Plateforme :** iOS
- **Motif observé :** Dans la création du profil freelance, trois blocs sont empilés :
  - « Hourly rate » à $38.89/hr (« Total amount the client will see ») ;
  - « Service fee » à -$3.89/hr, avec une phrase sur ce que paie la commission et un lien « Learn more » ;
  - « You'll get » à $35.00/hr (« The estimated amount you'll receive after service fees »).
- **Pourquoi ça marche :** Le freelance voit d'un coup d'œil comment son tarif devient ce qu'il touche. Les frais sont nommés, chiffrés et expliqués au lieu d'être cachés : la transparence crée la confiance.
- **Application chez RD Portage :** C'est exactement la logique du portage. Sur l'écran de fourchette du diagnostic flash, puis en haut des résultats, afficher la cascade « TJM » → « Frais de gestion RD Portage : 4 % » → les autres postes que le simulateur calcule déjà → « Net mensuel estimé ». Un lien « Pourquoi 4 % ? » déplie une explication courte.
  - Voir aussi Wise : sur l'[écran d'envoi](https://mobbin.com/screens/370316cc-c8c1-4555-9d6f-22be23213dae), la ligne « Total fees » est cliquable. Elle ouvre une [feuille de détail des frais](https://mobbin.com/screens/df705b5e-b692-4e71-8788-3b535ea181e7).

---

## Thème 2 : questionnaires en plusieurs étapes

### 3. Cash App : le statut en grandes tuiles, chacune avec sa définition

- **Application :** Cash App
- **Lien :** [Écran « What's your employment status? »](https://mobbin.com/screens/48895749-349e-4c68-8c52-4fa0d2485e73)
- **Plateforme :** iOS
- **Motif observé :** Quatre grandes tuiles en pleine largeur (Student, Employed, Self-employed, Unemployed). Chacune a une ligne de définition, par exemple « The majority of your income comes from your own business », et un bouton radio. Un seul bouton « Next » en bas.
- **Pourquoi ça marche :** La définition sous chaque libellé lève l'hésitation (« suis-je salarié ou indépendant ? »). Les grandes tuiles sont faciles à toucher au pouce.
- **Application chez RD Portage :** Pour la question 1 du diagnostic flash (statut), passer en tuiles pleine largeur et ajouter une ligne de définition sous chaque option actuelle. Pour les questions à choix unique, avancer automatiquement dès qu'on touche une tuile, avec un court délai pour voir la sélection.
  - Voir aussi N26 : son [flow « Answering questions »](https://mobbin.com/flows/fc7b54bc-18d1-4755-94eb-e81914511561) sépare « Freelancer » de « Self employed ».

### 4. Greenlight : un revenu approximatif choisi par tranche, et « Why do we ask this? »

- **Application :** Greenlight
- **Lien :** [Écran « What's your approximate annual household income? »](https://mobbin.com/screens/bb97d022-9f27-4d5c-9d59-6a52d5b5a8fc)
- **Plateforme :** iOS
- **Motif observé :** En haut, « QUESTION 9 OF 9 » et une barre de progression pleine. La question est posée dans une carte avec un lien « (i) Why do we ask this? ». On répond en choisissant une tranche (« Less than $50,000 », « $50,000 to $99,000 »…) ; la ligne choisie se colore et reçoit une coche.
- **Pourquoi ça marche :** Choisir une tranche plutôt que taper un chiffre exact enlève la peur de se tromper et le sentiment d'intrusion. « 9 sur 9 » annonce la fin. L'explication reste disponible sans encombrer l'écran.
- **Application chez RD Portage :** Poser la question 2 (TJM approximatif) en tranches, dont les bornes sont à fixer selon la clientèle réelle. Afficher « Question 2 sur 3 ». Ajouter un lien « Pourquoi cette question ? » qui déplie une phrase, par exemple : « Le TJM sert à estimer la fourchette de net ». Le TJM exact n'est demandé que plus tard, dans le simulateur.
  - Voir aussi Zing : [« Question 3 of 4 » avec des tranches](https://mobbin.com/screens/e4058526-1f03-4847-8371-d9b43603bdfc).

### 5. Monzo : un montant, un champ, le clavier numérique

- **Application :** Monzo
- **Lien :** [Écran « What's your annual salary? »](https://mobbin.com/screens/c3e7b5ae-3d0e-49dc-bae3-6e1004106bcc)
- **Plateforme :** iOS
- **Motif observé :** Sous la question, une phrase : « We'll use this to work out the future value of your workplace pension. » Un champ unique préfixé « £ ». Le pavé numérique s'ouvre directement. Le bouton « Next » reste grisé tant que le champ est vide.
- **Pourquoi ça marche :** Une question, un champ, le bon clavier : il n'y a rien à manipuler. La phrase « on s'en sert pour… » répond au « pourquoi » avant qu'il soit posé.
- **Application chez RD Portage :** Dans le simulateur, chaque montant (TJM exact, frais réels, versement PER) s'affiche seul dans son bloc, avec le pavé numérique (`inputmode="numeric"` ou `"decimal"`), l'unité dans le champ (« € / jour », « € / mois ») et une ligne « Sert à… » dessous. On ne lui donne pas pour autant un écran entier : le nombre d'écrans et de taps compte plus que la pureté du motif, et la plupart des montants sont facultatifs (repliés). Vérifier dans le navigateur intégré d'Instagram que le pavé numérique s'ouvre bien.
  - Voir aussi Fidelity : la question de salaire précise [« Estimates are OK. »](https://mobbin.com/screens/63d646ab-9796-4ec4-9aec-74b66fed9450).

### 6. Lemonade Insurance : questionnaire découpé en chapitres, tuiles illustrées, réponse pré-remplie

- **Application :** Lemonade Insurance
- **Lien :** [Flow « Getting a quote (homeowners) »](https://mobbin.com/flows/08572b7c-6292-4ba4-bff7-c405cad5999b)
- **Plateforme :** iOS
- **Motif observé :**
  - Le devis tient en 27 écrans, découpés en chapitres nommés dans l'en-tête (« General », « Exterior », « Final details », « Quote »), avec une barre de progression par segments et une flèche retour.
  - Les réponses sont de grandes tuiles avec pictos. Certaines arrivent pré-sélectionnées : « it looks like you have a Gable roof. If there's a better match, go ahead and pick it ».
  - Une icône téléphone reste visible en haut à droite.
  - À la fin, le prix mensuel reste fixé en bas de l'écran pendant qu'on ajuste la franchise.
- **Pourquoi ça marche :** Les chapitres rendent prévisible un long questionnaire. La pré-sélection transforme une question en simple confirmation. Un accès humain reste visible sans interrompre le parcours.
- **Application chez RD Portage :**
  - Découper le simulateur foyer en trois chapitres affichés en en-tête (Profil · Activité · Foyer), avec une barre par segments.
  - Pré-remplir ce que le diagnostic flash a déjà appris (statut, tranche de TJM) et le présenter « à confirmer ».
  - Pour la garde alternée, les frais réels et le PER, proposer trois tuiles : Oui, Non, « Je ne sais pas ».
  - Conserver les réponses sur l'appareil (c'est déjà le cas, en `localStorage`) : la flèche retour ou un rechargement du navigateur Instagram ne doit rien effacer.
  - Ne pas reprendre l'assistant fictif de Lemonade (« Maya ») : RD Portage a une vraie personne.
  - Voir aussi Ro : son [flow « Onboarding »](https://mobbin.com/flows/c40ee07f-972a-43b2-83b4-666d7f6df86e) tourne dans Safari mobile et propose les tuiles « Another option not listed here » et « Not sure yet ».

---

## Thème 3 : montrer la valeur avant de demander les coordonnées

### 7. Cash App Taxes : un gros chiffre, les hypothèses avouées, puis seulement l'action

- **Application :** Cash App
- **Lien :** [Flow « Estimating tax refund »](https://mobbin.com/flows/96be6863-50d1-41b7-8151-d78322c5f2e3) ; [écran de résultat](https://mobbin.com/screens/563b492c-9b3e-4384-8e58-db73ad8fa441)
- **Plateforme :** iOS
- **Motif observé :**
  - Les questions arrivent une par une. « Do you have any dependents? » se répond par deux tuiles Oui / Non, avec une ligne d'explication. Pour le revenu du foyer, l'écran précise « You can round to the nearest dollar » et propose « How to calculate this ».
  - Le résultat s'affiche en très gros (« Your federal refund estimate : $14,891 »), suivi d'une décomposition en trois lignes et du lien « Have changes? Start over ».
  - Un bloc « Calculation details » annonce : « We made a few assumptions, but we'll get all the details when you file ».
  - Les boutons « File for free » / « Why file with us » ne viennent qu'après.
- **Pourquoi ça marche :** La personne obtient le chiffre avant de s'engager à quoi que ce soit. Avouer les hypothèses rend le chiffre crédible et donne une raison naturelle à l'étape suivante : préciser.
- **Application chez RD Portage :**
  - Sur l'écran de résultats, afficher le net mensuel en très grand, puis une décomposition courte.
  - Ajouter un bloc « Hypothèses retenues » qui liste uniquement ce que le calcul suppose réellement.
  - La transition vers le formulaire devient : « Ridha vérifie ces hypothèses lors du rappel ».
  - Proposer « Modifier une réponse », qui ramène à la question concernée : c'est mieux que de tout recommencer.
  - Attention : l'[écran suivant de Cash App](https://mobbin.com/flows/ef82af31-3237-48e1-acef-11c7fc04ceca) met en avant une note sur 5 étoiles et une distinction de presse. Chez RD Portage, ce motif ne s'applique qu'avec des avis ou distinctions réels et vérifiables ; sinon, ne pas l'utiliser.

### 8. Alan : simuler les coûts du foyer, avec le droit de « jouer »

- **Application :** Alan
- **Lien :** [Écran « Simulate your costs »](https://mobbin.com/screens/d8bbf5a1-c7f9-4217-ad2d-b7a14ab76cb6)
- **Plateforme :** iOS
- **Motif observé :** Une note en tête : « updating values here won't change anything to your premium. You can play with this as much as you'd like. » Puis un interrupteur « Your partner » et un champ « Number of children (up to 24 y/o included) ». En dessous, le coût mensuel (« €68,50 per month at your expense ») se met à jour, avec une ligne par membre du foyer.
- **Pourquoi ça marche :** Pouvoir essayer sans conséquence enlève la peur de s'engager. Le recalcul en direct montre ce que chaque réponse change pour le foyer.
- **Application chez RD Portage :**
  - Dans le chapitre Foyer : un interrupteur pour la situation familiale, un compteur « − / + » pour les enfants, des tuiles Oui / Non pour la garde alternée.
  - Le net estimé, collé en bas de l'écran, se met à jour à chaque changement.
  - Ajouter une phrase équivalente à celle d'Alan, à condition qu'elle soit exacte : par exemple, aucune donnée n'est transmise avant l'envoi du formulaire.
  - Ne reprendre ni le ton ni les illustrations d'Alan.

### 9. Opendoor : la fourchette d'abord, l'appel ensuite pour la relire

- **Application :** Opendoor
- **Lien :** [Flow « Scheduling an offer review »](https://mobbin.com/flows/1c382418-86fd-4134-a93e-1088ebdee6c7)
- **Plateforme :** iOS
- **Motif observé :**
  - Le flow s'ouvre sur « Estimated sale price $1.3M – $1.5M », avec la phrase « Schedule a quick call to review both and chat about what's next » et un bouton « Review your offer ».
  - Viennent ensuite le choix du jour, puis un récapitulatif « Estimated Offer Review · 20 min · créneau · fuseau horaire » et la saisie du nom.
  - Après réservation, la même carte d'accueil affiche « You're scheduled to review both… » et un bouton « Reschedule ».
- **Pourquoi ça marche :** L'appel est présenté comme la suite logique d'une estimation déjà donnée (« on la relit ensemble »), pas comme une démarche commerciale. Sa durée est annoncée avant toute saisie.
- **Application chez RD Portage :** Après la fourchette du diagnostic flash, le bouton secondaire peut devenir « Faire vérifier ma fourchette par Ridha ». Sur les résultats, le bouton du formulaire nomme le bénéfice : « Recevoir le dossier et être rappelé par Ridha ». Annoncer aussi la durée réelle de l'appel, que Ridha doit fixer : ne pas l'inventer. Après l'envoi, si la personne revient sur la page, elle voit « Rappel prévu sous 24 h » au lieu du formulaire.

---

## Thème 4 : saisie du téléphone et demande de rappel

### 10. Alan : un champ téléphone justifié en une ligne

- **Application :** Alan
- **Lien :** [Écran « What is your phone number? »](https://mobbin.com/screens/e21f731b-3d9b-4845-b2c1-fd22270cc3d3)
- **Plateforme :** iOS
- **Motif observé :** Un seul champ. Le sous-titre explique : « The health team needs it in case of emergency. » Un sélecteur d'indicatif avec drapeau, un exemple de format dans le champ. Sous le bouton : « Your number is shared only with Alan's healthcare staff. Learn more ».
- **Pourquoi ça marche :** En deux lignes, l'écran dit pourquoi on demande le numéro, qui le verra et où en savoir plus. L'exemple de format réduit les erreurs de saisie.
- **Application chez RD Portage :**
  - Configurer le champ avec l'indicatif +33 par défaut, `type="tel"` et `autocomplete="tel"` (clavier téléphone et remplissage automatique), et l'exemple « 06 12 34 56 78 ».
  - La validation doit accepter les espaces et le format +33.
  - Sous-titre : « Pour que Ridha rappelle sous 24 h et commente le dossier. »
  - Sous le bouton, une ligne sur l'usage du numéro, uniquement si elle décrit la pratique réelle, avec un lien vers la politique de confidentialité.
  - Rester à trois champs au plus (prénom, téléphone, et l'e-mail si Ayoub le garde obligatoire) : ni nom de famille ni message libre.
  - Voir aussi Bumble : un [cadenas et la mention « We never share this with anyone »](https://mobbin.com/screens/05c421be-e8a8-411f-aec4-c8cdf723da29) à côté du pavé numérique.

### 11. Future Pro : un appel avec une personne nommée, une durée annoncée et une sortie de secours

- **Application :** Future Pro
- **Lien :** [Flow « Scheduling a call with coach »](https://mobbin.com/flows/87803b30-1b48-4835-a239-7684250cb196) ; voir aussi l'[écran « Book your kickoff call with Lee »](https://mobbin.com/screens/56a56b7d-7c3b-4137-8113-d729758477b6)
- **Plateforme :** iOS
- **Motif observé :**
  - Premier écran : « A quick 15-30 minute FaceTime call. »
  - Ensuite : la photo de la coach, une phrase sur le but de l'appel, des onglets de jours, des créneaux en tuiles, un bouton « Confirm » et un lien « None of these times work ».
  - La confirmation est nommée : « Kickoff Call with Aurelia, Fri, Oct 4 at 3:45 AM », avec « Add to calendar » et « Reschedule ».
  - L'écran avec Lee suit le même modèle : « This 30 minute one-on-one call is… ».
- **Pourquoi ça marche :** On sait avec qui, combien de temps et pourquoi. « Aucun créneau ne convient » évite l'abandon. La confirmation nommée transforme une demande abstraite en rendez-vous concret.
- **Application chez RD Portage :**
  - Sur le formulaire, mettre une vignette photo de Ridha avec la phrase « Ridha rappelle sous 24 h pour commenter le dossier », plus la durée réelle de l'appel une fois fixée.
  - Ne pas ajouter de champ obligatoire. Après l'envoi seulement, proposer en option une préférence de moment (trois tuiles : matin, midi, fin de journée).
  - Confirmation nommée : « Demande reçue. Ridha rappelle au 06 … sous 24 h. »

### 12. Ro : ce qui va se passer, étape par étape, après l'envoi (web mobile)

- **Application :** Ro
- **Lien :** [Écran « Great news! Your information was successfully submitted. »](https://mobbin.com/screens/4f1b2a26-79ae-4154-b286-741e351ff7d9)
- **Plateforme :** iOS (parcours web ouvert dans Safari, start.ro.co)
- **Motif observé :** Après l'envoi, un titre de confirmation puis « WHAT'S NEXT » : une frise verticale. Chaque étape a un délai : « Submitted » (cochée), « Typically within 2-3 days : Provider review » (dépliable, avec ce que fait le professionnel), « Treatment approval », « Get medication ».
- **Pourquoi ça marche :** Après avoir laissé son numéro, on veut savoir ce qui arrive et quand. La frise avec délais rassure et prépare à recevoir l'appel, donc moins d'appels manqués.
- **Application chez RD Portage :**
  - La page de remerciement montre trois étapes : « Dossier envoyé par e-mail » (cochée), « Appel de Ridha sous 24 h », « Échange sur la simulation ».
  - Afficher le numéro réel depuis lequel Ridha appelle (à confirmer par Ridha : la ligne de l'équipe, 01 71 49 71 57, ou un autre), pour que l'appel ne soit pas pris pour du démarchage.
  - Voir aussi Alan : l'écran [« Your request was sent! »](https://mobbin.com/screens/2380e885-e813-45b1-889e-c613332e8fc5) suit le même modèle en trois états.

---

## Thème 5 : bandeau cookies mobile compact (Accepter / Refuser de même poids)

### 13. Fibery : une barre basse d'une ligne, avec Refuser et Accepter identiques

- **Application :** Fibery
- **Lien :** [Écran d'accueil avec bandeau cookies](https://mobbin.com/screens/a8eb45e6-ca91-450d-a459-5fcfc3a0325f)
- **Plateforme :** Web
- **Motif observé :** Un bandeau d'une ligne est fixé en bas de page : une phrase avec un lien « cookie policy », puis « More Options » en lien texte. Ensuite, « Reject All » et « Accept All » : deux boutons de même taille et de même style (contour). Le titre et le bouton principal de la page restent visibles et utilisables.
- **Pourquoi ça marche :** Le choix prend une seconde et ne cache pas la promesse de la page. Les deux boutons ont le même poids visuel, ce qu'exige la CNIL, sans que le bandeau paraisse hostile.
- **Application chez RD Portage :**
  - En version mobile, le bandeau en bas ne dépasse pas environ un quart de la hauteur d'écran. Il contient une phrase, puis « Refuser » et « Accepter » côte à côte, de même largeur, même couleur et même graisse, et « Personnaliser » en lien texte.
  - Réserver en bas de page une marge de la hauteur du bandeau, pour qu'il ne recouvre jamais le bouton « Calculer mon net ».
  - Le diagnostic flash doit rester utilisable sans attendre la réponse au bandeau.
  - Voir aussi :
    - [Hotjar (web)](https://mobbin.com/screens/0aa29a31-39ee-4cfe-a781-58fb260b9b0d) : « Accept all » et « Decline all » identiques, au-dessus d'un questionnaire en tuiles qui reste utilisable ;
    - [HYPE (iOS)](https://mobbin.com/screens/21b5b119-e7c1-4eef-852e-d7c0e44d7a37) : « Deny » et « Accept All » côte à côte, de même taille, mais de couleurs différentes ; à harmoniser.
  - **Contre-exemple à ne pas reproduire :** [Quizlet (iOS)](https://mobbin.com/screens/51b852e6-0ac3-46f6-b4a8-c071ace275a7). « Accept All » est plein, « Reject All » en simple contour sous « Customize », et le texte est long.

---

## Thème 6 : éléments de confiance près du bouton principal

### 14. Future Pro : la fiche du coach (photo, prénom, parcours) et un bouton à son nom

- **Application :** Future Pro
- **Lien :** [Écran « Coaches : Matt »](https://mobbin.com/screens/836e114a-c251-45bb-a991-a5f23b623e69)
- **Plateforme :** iOS
- **Motif observé :** Une grande photo, le prénom « Matt », une rubrique « Past experience » avec une phrase factuelle sur son parcours. Puis un lien « More About Matt », un bouton « Continue with Matt » et un lien « View More Coaches ».
- **Pourquoi ça marche :** Le bouton porte le nom de la personne : on ne « soumet » pas un formulaire, on s'adresse à quelqu'un. Un parcours passé, décrit sobrement, suffit à rendre crédible.
- **Application chez RD Portage :**
  - Juste au-dessus du bouton du formulaire : une vignette photo de Ridha et la ligne « Ridha, fondateur, ancien consultant porté ».
  - Libellé du bouton : « Être rappelé par Ridha ».
  - Pas de note, de compteur de clients ni de logos, sauf s'ils sont réels et vérifiables.
  - Voir aussi la [lettre du CEO d'Ada](https://mobbin.com/sites/sections/3eb52aa7-420a-4211-ba9b-5793316410d6) : une petite photo dans le titre et une signature manuscrite.

### 15. Ramp : la mention réglementaire placée juste sous le chiffre

- **Application :** Ramp
- **Lien :** [Section « Give your company a raise. »](https://mobbin.com/sites/sections/4c3bb2de-4b4d-41b6-90d5-8a273bd30011)
- **Plateforme :** Web (section)
- **Motif observé :** Un chiffre géant ($100,000 /Year), une comparaison avec un renvoi « ¹ », un curseur « Balance ». Juste dessous, une pastille grise discrète : « Ramp Business Corporation is a financial technology company and is not a bank… Member FDIC. »
- **Pourquoi ça marche :** Le chiffre attire l'œil, et la mention juste à côté dit qui parle et dans quel cadre. La transparence est placée là où le doute naît, et non reléguée en pied de page.
- **Application chez RD Portage :** Sous la fourchette et sous le net estimé, une ligne grise : « Estimation indicative · RD Portage, société de portage salarial · frais de gestion 4 % · Mentions légales » (en lien). Les hypothèses de calcul sont signalées par des renvois numérotés. N'y mettre que des mentions réelles.

---

## Principes retenus

1. **Le chiffre d'abord, le numéro ensuite.** Garder le diagnostic flash sans coordonnées et ne montrer le formulaire qu'après les résultats. Le rappel est présenté comme la suite logique du chiffre : « faire vérifier ces hypothèses par Ridha » (réf. 7, 9).
2. **Une question, un écran, un geste — dans le diagnostic.** Des tuiles pleine largeur, l'avance automatique pour les choix uniques, des tranches quand un chiffre exact n'est pas nécessaire, le pavé numérique pour les montants, et une réponse « Je ne sais pas » quand elle a un sens. Le diagnostic flash reste à trois questions, une par écran. Le simulateur, lui, garde un écran par chapitre, mais n'y affiche que ce qui concerne la personne : moins d'écrans, moins de taps (réf. 3 à 6).
3. **Chaque donnée se justifie au moment où on la demande.** Une ligne « Sert à… » sous chaque question sensible. Pour le téléphone, trois informations : pourquoi, qui appelle, quand (réf. 4, 5, 10).
4. **Montrer la cascade TJM → 4 % → net.** Les frais de gestion sont nommés et chiffrés à côté du résultat, avec un « Pourquoi 4 % ? » dépliable. C'est l'argument central de RD Portage : il doit être visible au moment où le chiffre apparaît (réf. 2).
5. **Une personne nommée, une durée, une suite.** Le formulaire affiche la photo et le prénom de Ridha et la durée réelle de l'appel. Le bouton dit « Être rappelé par Ridha ». La page de remerciement détaille les étapes et le numéro qui appellera (réf. 11, 12, 14).
6. **Ne jamais perdre une réponse.** Les chapitres sont visibles, la flèche retour conserve tout, et chaque réponse se modifie directement depuis les résultats. Les réponses sont gardées en mémoire contre les rechargements du navigateur Instagram (réf. 6, 7).
7. **Respecter la conformité sans freiner le parcours.** Un bandeau cookies compact, où Refuser pèse autant qu'Accepter, qui ne cache jamais le bouton principal. Une ligne de mentions légales en gris juste sous le chiffre (réf. 13, 15).

---

*On reprend des motifs, jamais le design, les illustrations ou la marque d'une autre entreprise.*
