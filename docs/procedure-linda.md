# Suivi manuel des leads dans Resend

Chaque lead arrive de deux façons : un e-mail de notification « Nouveau lead
simulateur — {Prénom} — {pub} » aux adresses de `MAIL_INTERNAL_TO`, et un
contact dans Resend → Contacts. Deux étapes du parcours ne peuvent pas être
saisies automatiquement : l'appel (`call_done`) et la signature (`signe`).

## Au quotidien

1. **Nouveaux leads** : partir de l'e-mail de notification (bouton d'appel,
   source, résumé de la simulation, lien vers le dossier). La liste complète
   est dans Resend → Contacts, avec les propriétés `telephone`,
   `utm_content`, `resume_simulation`, etc. (liste : `docs/schema-lead.md`).
2. **Export** : `https://simulateur.rdportage.com/api/export?token=<EXPORT_TOKEN>`
   télécharge un CSV (séparateur `;`) qui s'ouvre dans Excel.
3. **Rappeler sous 24 h** : c'est l'engagement affiché au prospect.

## Après un appel (call_done)

Dans Resend → Contacts, ouvrir le contact et renseigner :

- `funnel_stage` = `decision`
- `last_event` = `call_done`, `last_event_at` = la date du jour
- `sequence_stop` = `oui` (le prospect a été joint)

## Après une signature (signe)

- `funnel_stage` = `signe`
- `last_event` = `signe`, `last_event_at` = la date du jour

Sans cette saisie, la conversion finale n'est mesurée nulle part.

## Demande de suppression (RGPD)

Le droit à l'effacement est inconditionnel. Supprimer le contact dans
Resend → Contacts, puis les e-mails de notification de ce lead dans la boîte
qui les reçoit.
