# Procédure de saisie manuelle — Linda

Deux événements du funnel ne peuvent pas être automatisés et doivent être
saisis à la main après chaque échange : `call_done` et `signe`.

## Au quotidien

1. **Récupérer les nouveaux leads** : ouvrir
   `https://<domaine>/api/export?token=<EXPORT_TOKEN>` → le fichier CSV
   s'ouvre dans Excel (séparateur `;`). Mêmes colonnes que le fichier
   partenaire actuel : prénom, email, téléphone, statut, TJM, économie
   estimée, étape funnel, source, consentement.
2. **Prioriser** : trier par `economie_annuelle_eur` décroissante ; les leads
   avec téléphone renseigné ont explicitement demandé à être rappelés.

## Après un call Diagnostic (call_done)

- **Brevo** : ouvrir le contact → attribut `FUNNEL_STAGE` → `decision`,
  attribut `LAST_EVENT` → `call_done`.
- **Airtable** : table Leads → ligne du lead → `funnel_stage` = `decision` ;
  table Events → ajouter une ligne `lead_id` / `call_done` / date du jour.

## Après une signature (signe)

- Même manipulation avec `signe`. C'est CE champ qui alimente la dernière
  ligne du rapport hebdo — sans saisie, pas de mesure de conversion finale.

## Demande de suppression RGPD

Transmettre l'email du demandeur au technique : suppression via
`deleteLead` + purge du journal local. Ne jamais répondre « on garde au cas
où » — le droit à l'effacement est inconditionnel ici.
