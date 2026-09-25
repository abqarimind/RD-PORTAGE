# Message à l'équipe RD Portage — retours sur le simulateur

> Brouillon à relire avant envoi. Destinataires : Sheraz, Linda, Ridha.

---

Bonjour à tous,

Merci pour vos retours sur le simulateur (Sheraz, et Linda pour le retour du salarié porté). Voici ce qui a été modifié, ce qu'il reste à régler de votre côté, et quelques propositions pour la suite.

## Ce qui a été modifié

**1. Des montants plus lisibles**
- Le « € » ne touche plus le chiffre dans les champs de saisie (« 500 € » au lieu de « 500€ »). C'était un défaut d'affichage qui touchait les trois champs : TJM, jours facturés et frais professionnels.
- Les milliers sont maintenant bien séparés partout : « 63 681 € » au lieu de « 63681 € ». Cela vaut pour le tableau de résultats, le dossier et les emails.

**2. Le contact passe par un conseiller, plus par Ridha**
- Le bouton « Valider ce chiffre — appeler Ridha » devient **« Parler à mon conseiller »**. Même libellé sur les résultats, après l'inscription, dans le dossier et sur les pages d'accueil.
- Le portable de Ridha est retiré de tout le site et des emails. C'est désormais la ligne de l'équipe, **01 71 49 71 57**, qui apparaît partout, en clair sous le bouton (utile sur ordinateur, où on ne peut pas cliquer pour appeler).
- Ridha reste présent dans l'histoire du fondateur : sa photo, son parcours sur la page d'accueil et la signature de la séquence d'emails.

**3. Un rappel sous 24 h**
- Le prospect qui laisse son numéro lit et reçoit : « Un conseiller RD Portage vous rappelle sous 24 h au [son numéro] ».
- S'il n'a pas laissé de numéro, on ne lui promet plus un rappel « au numéro indiqué » (c'était le cas avant). On lui dit qu'un conseiller revient vers lui par email sous 24 h, et on lui donne la ligne de l'équipe.
- Chaque demande arrive sur **marketing@rdportage.com**. Il suffit de surveiller cette boîte, et vous pouvez bien sûr rappeler plus vite que 24 h. Quand vous rappellerez systématiquement dans l'heure, on pourra afficher un « rappel immédiat ».

**4. Les emails qui arrivent dans les spams**
- Un message prévient le prospect avant l'envoi : « Votre dossier arrive par email dans la minute… pensez à vérifier vos spams ».
- Après l'envoi, on lui rappelle l'adresse saisie (pratique pour repérer une faute de frappe) et on l'invite à regarder dans ses spams et l'onglet Promotions, puis à ajouter marketing@rdportage.com à ses contacts.
- Le même conseil figure dans l'email de récapitulatif.

**5. Quand le prospect clique sur « Répondre », son message vous arrive**
- Les emails envoyés aux prospects partent de **marketing@rdportage.com**, et « Répondre » écrit à cette même adresse.
- Les copies internes (récapitulatif et demande de rappel) partent d'une autre adresse, simulateur@rdportage.com. Un email envoyé de marketing@ vers marketing@ est souvent mal classé par Gmail, et vous risqueriez de rater des demandes.

## Ce dont nous avons besoin de votre côté

1. **Vérifier que marketing@rdportage.com reçoit bien les emails** et qu'une personne la consulte chaque jour : c'est elle qui reçoit les demandes de rappel et les réponses des prospects.
2. **Un petit réglage DNS (Linda)**, pour savoir si nos emails sont bien authentifiés chez Gmail et Outlook. Remplacer l'enregistrement TXT `_dmarc` par :
   `v=DMARC1; p=none; rua=mailto:marketing@rdportage.com`
   Aujourd'hui, l'enregistrement ne contient pas d'adresse de rapport, donc personne n'est prévenu en cas de problème. Rien d'autre à changer : le reste de la configuration email est déjà correct.
3. **La séquence de 6 emails (J0 → J14)** est paramétrée dans l'outil d'envoi. Nous alignerons son expéditeur et son adresse de réponse sur marketing@rdportage.com.

## Suggestions d'amélioration

**Laisser le prospect choisir son jour et son créneau de rappel.**
C'était la deuxième idée du salarié porté : choisir un jour et une plage horaire (8h-10h, 10h-12h, 14h-16h…) et recevoir une confirmation. Un consultant en mission ne peut pas décrocher à toute heure : choisir son moment réduit les appels manqués et rassure. Deux façons de le faire :

- **Utiliser un outil de prise de rendez-vous.** C'est souvent ce que préfèrent les gens, qui connaissent déjà ces interfaces :
  - **Calendly** : le plus connu, très simple, confirmation et rappels automatiques, synchronisé avec votre agenda.
  - **Cal.com** : équivalent de Calendly, open source, facile à intégrer dans le site, avec une offre gratuite.
  - **iClosed** : pensé pour les rendez-vous commerciaux. Questions de qualification avant la réservation, répartition des appels entre plusieurs conseillers, rappels automatiques.

  Le site est déjà prêt : il suffit de nous donner le lien de réservation, et le bouton « Parler à mon conseiller » y mènera. Ces outils envoient eux-mêmes la confirmation et les rappels, ce qui réduit les rendez-vous manqués.
- **Un choix de créneau directement dans le simulateur**, sur mesure. Il reste dans le parcours et suit la charte du site, mais demande quelques jours de développement et n'envoie pas de rappel automatique la veille.

**Notre recommandation :** commencer par un outil (Cal.com ou Calendly) avec un créneau « Diagnostic 30 min ». C'est rapide à mettre en place et facile à changer. Il faut d'abord décider : qui prend les appels, sur quels jours et horaires, et combien de rendez-vous par jour.

**Autres pistes :**
- Rappel par SMS la veille ou une heure avant le rendez-vous.
- Un conseiller attitré par prospect, pour que « mon conseiller » soit une réalité du premier appel à la signature.
- Un point dans 2 à 3 semaines sur les chiffres : nombre de demandes de rappel, rappels effectués, emails arrivés en boîte de réception.

N'hésitez pas à continuer à nous envoyer vos retours au fil de vos tests.

Bien à vous,
Ayoub
