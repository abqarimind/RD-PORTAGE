# Email — point d'étape client

> Brouillon à relire et adapter avant envoi.
> Destinataire : Ridha · Copie : Linda

---

**Objet :** Plateforme testable sur simulateur.rdportage.com — et une décision à prendre avant la campagne

---

Bonjour Ridha,

La plateforme est en ligne et testable dès maintenant sur
**simulateur.rdportage.com**. Voici où nous en sommes.

## Les retours du 04/09 et du 08/09 sont traités

Les sept points remontés par vos utilisateurs sont corrigés :

- le retour en arrière ne fait plus perdre les informations saisies ;
- le TJM exact reste accessible à tout moment, et une fourchette ne peut plus
  produire un résultat à 0 € ;
- une seconde simulation rejoue bien toutes les étapes, via un bouton
  « Nouvelle simulation » explicite ;
- la mention « avantages inclus » suit désormais la sélection réelle ;
- la saisie du TJM se fait au clavier numérique sur mobile, sans molette ;
- le bouton « Télécharger le dossier » est remplacé par un **dossier web**,
  qui s'ouvre sur tous les appareils et dont le lien est envoyé par email —
  c'est plus fiable qu'un PDF, en particulier sur iPhone ;
- les emails de récapitulatif et de confirmation sont branchés.

Le parcours a aussi été raccourci : le diagnostic flash transmet maintenant
ses réponses au simulateur. Vos utilisateurs ne ressaisissent plus leur
profil ni leur TJM — c'était 45 à 90 secondes de ressaisie juste après le
premier engagement, à l'endroit le plus coûteux du tunnel.

**Ce que je vous propose de tester en priorité**, puisque ce sont vos trois
scénarios d'origine : le retour en arrière pour modifier un TJM, une seconde
simulation d'affilée, et le parcours complet depuis un iPhone.

## Un point bloquant avant d'ouvrir le budget média

Aujourd'hui, **les leads ne sont conservés nulle part**. La configuration en
place stocke les données en mémoire, et sur notre hébergement cette mémoire
est vidée à chaque requête. Tant que ce point n'est pas réglé, un lead payé
par la publicité peut être définitivement perdu.

Les emails de notification que je viens de brancher vous alertent désormais
quand c'est le cas, avec les données brutes du lead pour les récupérer à la
main — mais c'est un filet de sécurité, pas une solution.

**C'est le dernier verrou avant la campagne.** Il se lève en une demi-journée
dès que la décision est prise.

## La décision : quel outil pour vos leads

Vous aviez deux pistes ouvertes, Brevo et Airtable, sans avoir tranché. J'ai
regardé les deux, ainsi que les alternatives du marché, et je vous ai préparé
une note détaillée (ci-jointe). En résumé :

**Ma recommandation : commencer par Airtable cette semaine, puis passer à
Brevo.**

- **Airtable maintenant** : le branchement est déjà développé et fonctionne,
  Linda y retrouve un tableur qu'elle sait lire, et aucune donnée n'est perdue
  en cas de migration ultérieure. Zéro développement, mise en service
  immédiate. Gratuit à votre volume.
- **Brevo ensuite** : c'est lui qui pourra envoyer votre séquence de 6 emails
  sur 14 jours, qu'aucun outil ne prend en charge aujourd'hui — les textes
  sont écrits mais rien ne les envoie. Brevo réunit la base de contacts, la
  séquence et un CRM simple dans un seul outil, en français, à partir de
  gratuit.

J'ai relevé un défaut dans le branchement Brevo existant qui doit être corrigé
avant la bascule — environ une demi-journée, détaillé dans la note.

Pour ce dont j'ai besoin de votre côté : les accès (une base Airtable et une
clé d'API), et votre décision sur Brevo.

## Un sujet qui dépasse notre périmètre, mais que je dois vous signaler

Depuis le **1er septembre 2026**, toute entreprise assujettie à la TVA doit
être en mesure de **recevoir ses factures au format électronique** via une
plateforme agréée. Les PME sont concernées dès cette première échéance ;
l'obligation d'émettre arrivera au 1er septembre 2027.

Pour une société de portage, qui facture ses clients pour le compte de ses
portés, ce n'est pas un détail. Deux questions à vérifier de votre côté :
êtes-vous inscrits auprès d'une plateforme agréée, et qui émettra vos
factures au format structuré l'an prochain ?

Aucun CRM ne répond à cette obligation. Dans la note, je vous signale
également les logiciels métier dédiés au portage (contrats, comptes rendus
d'activité, facturation, préparation de la paie) — c'est probablement votre
vrai sujet logiciel des douze prochains mois, et il est distinct du CRM.

## Deux points qui attendent votre validation

1. **Le message destiné aux micro-entrepreneurs.** À revenu égal, la
   micro-entreprise reste plus favorable que le portage : le simulateur
   l'affiche désormais honnêtement, avec en regard ce que le portage apporte
   (statut de salarié, chômage, retraite, prévoyance, congés payés). J'ai
   rédigé ce texte, mais c'est votre discours commercial — merci de le relire.
2. **Le délai de rappel.** L'email de demande de diagnostic annonce un rappel
   « sous 24 h ouvrées ». C'est un engagement pris en votre nom : dites-moi
   s'il vous convient.

Je reste disponible pour en parler de vive voix.

Bien à vous,
Ayoub
