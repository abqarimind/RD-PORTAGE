/**
 * CONTRAT DE DONNÉES DU RÉCAPITULATIF — spec §5.3.
 *
 * C'est le payload stable et typé que consomment, sans exception :
 *   - l'email E1 (récapitulatif utilisateur) et sa copie interne E2 ;
 *   - l'email E3 (confirmation d'inscription) et sa notification interne E4 ;
 *   - la page « dossier » (/dossier) — l'artefact visuel.
 *
 * Le design de l'email et du dossier est conçu séparément et remplacera les
 * gabarits sobres livrés ici. Ce fichier est le contrat sur lequel ce design
 * s'appuie : il ne doit évoluer qu'en connaissance de cause (voir
 * PAYLOAD_VERSION).
 *
 * Toutes les valeurs monétaires sont en EUROS, arrondies à l'unité, sauf
 * mention explicite. Les taux sont des RATIOS (0.412 = 41,2 %), jamais des
 * pourcentages déjà multipliés — un seul format, pour qu'aucun gabarit n'ait
 * à deviner.
 */

/** Version du contrat. À incrémenter à tout changement non rétrocompatible. */
export const PAYLOAD_VERSION = "simulation_result_v1" as const;

/* ————————————————————————— identité ————————————————————————— */

/** Profil déclaré à l'étape 1, aligné sur CurrentStatus du moteur. */
export type ProfilUtilisateur =
  | "consultant_freelance"
  | "deja_porte"
  | "salarie_esn"
  | "reconversion"
  | "impatrie";

export interface IdentitePayload {
  prenom: string;
  email: string;
  /** Optionnel : seulement si l'utilisateur souhaite être rappelé. */
  telephone?: string;
  profil: ProfilUtilisateur;
  /** Libellé lisible du profil, prêt à afficher (« Déjà en portage »). */
  profilLabel: string;
}

/* ————————————————————————— activité ————————————————————————— */

/** Mode de saisie du TJM — mémorisé, restituable, basculable (BUG-02). */
export type TjmMode = "exact" | "fourchette";

export interface ActivitePayload {
  /** Valeur de calcul retenue (€ HT/jour). Pour une fourchette : la médiane. */
  tjm: number;
  tjmMode: TjmMode;
  /**
   * Renseigné uniquement quand tjmMode === "fourchette" : les bornes de la
   * fourchette choisie et son libellé, pour que le récapitulatif puisse dire
   * « fourchette 350–500 € (calcul sur 425 €) » plutôt qu'un chiffre sec.
   */
  tjmFourchette?: { id: string; label: string; min: number; max: number; mediane: number };
  /** Jours facturés par mois. */
  joursFactures: number;
  /** Jours facturés par an (joursFactures × 12) — évite le recalcul aval. */
  joursFacturesAnnuels: number;
  /** Frais professionnels mensuels demandés (NDF). */
  fraisProMensuels: number;
}

/* ————————————————————————— foyer ————————————————————————— */

export interface FoyerPayload {
  situation: "celibataire" | "marie_pacse";
  situationLabel: string;
  /** Nombre de parts fiscales retenu par le moteur IR. */
  nombreDeParts: number;
  enfants: number;
  enfantsGardeAlternee: number;
  /** Revenu net imposable annuel du conjoint (0 si sans objet). */
  revenuConjoint: number;
  modeDeduction: "forfait_10" | "frais_reels";
  modeDeductionLabel: string;
  /** Montant annuel des frais réels, si modeDeduction === "frais_reels". */
  fraisReelsAnnuels: number;
  /** Versements PER annuels prévus. */
  per: number;
  /** Autres revenus du foyer : fonciers, dons (réduction d'impôt). */
  autresRevenus: { foncier: number; dons: number };
}

/* ————————————————————————— avantages ————————————————————————— */

export interface AvantagePayload {
  id: string;
  label: string;
  /** Montant brut mensuel avant frais de service du prestataire. */
  montantBrutMensuel: number;
  /** Montant NET de frais de service, mensuel — c'est ce qui est affiché. */
  montantNetMensuel: number;
  /** Montant net annuel (montantNetMensuel × 12). */
  montantNetAnnuel: number;
  /** Frais de service appliqués, en clair (« 60 €/an + 3,5 % »). */
  fraisDeService: string;
}

export interface AvantagesPayload {
  /** Vide si l'utilisateur n'a sélectionné aucun avantage. */
  selection: AvantagePayload[];
  /** Total net mensuel de tous les avantages sélectionnés. */
  totalNetMensuel: number;
  totalNetAnnuel: number;
  /** Titres-restaurant inclus dans la simulation. */
  titresResto: { inclus: boolean; creditMensuel: number };
  /**
   * Vrai si et seulement si au moins un avantage est retenu. Les gabarits
   * DOIVENT dériver la mention « avantages inclus » de ce booléen et de rien
   * d'autre — c'est l'invariant qui empêche BUG-04 de réapparaître.
   */
  avantagesInclus: boolean;
}

/* ————————————————————————— résultats ————————————————————————— */

export interface ScenarioPayload {
  id: "actuel" | "portage_rd" | "portage_rd_optimise";
  label: string;
  /** CA HT annuel entrant (ou salaire brut annuel pour un salarié). */
  caHt: number;
  netPercu: number;
  avantages: number;
  impotFoyer: number;
  /** netPercu + avantages − impotFoyer. */
  disponible: number;
  tauxMoyenImposition: number;
  tmi: number;
}

export interface ResultatsPayload {
  /** Cascade mensuelle du scénario RD optimisé — le « comment c'est calculé ». */
  mensuel: {
    caHt: number;
    fraisDeGestion: number;
    assurancesTaxes: number;
    fraisPro: number;
    /** Valeur de la cagnotte pour le consultant (nette de frais). */
    cagnotte: number;
    /**
     * Coût prélevé sur l'enveloppe (valeur + frais du prestataire, ex.
     * abonnement May 68,50 €). Absent des dossiers signés avant le 25/09 :
     * les lecteurs retombent alors sur `cagnotte`.
     */
    cagnotteCout?: number;
    disponible: number;
    brut: number;
    cotisationsSalariales: number;
    netVerse: number;
    titresResto: number;
    percuNet: number;
    remunerationGlobale: number;
  };
  /** Taux de restitution réel : rémunération globale / CA HT, AVANT impôt sur le revenu. */
  tauxRestitution: number;
  /** Part de ce taux en avantages non retirables en argent (#28). Absent des anciens dossiers. */
  tauxAvantages?: number;
  /** Annuel, foyer complet. */
  netImposableAnnuel: number;
  impotNet: number;
  tauxMoyenImposition: number;
  tmi: number;
  /** Les 3 scénarios comparés, dans l'ordre : actuel, portage, optimisé. */
  scenarios: ScenarioPayload[];
  /**
   * Faux pour un profil sans situation actuelle à comparer (« en
   * transition »). Les gabarits DOIVENT masquer tout bloc comparatif quand
   * ce champ est faux : un écart, même nul, n'a aucun sens sans point de
   * comparaison, et l'afficher violerait l'invariant anti-zéro (§4.2).
   */
  comparable: boolean;
  /**
   * Le « laissé sur la table » : disponible optimisé − disponible actuel.
   * N'a de sens que si `comparable` est vrai.
   * PEUT ÊTRE NÉGATIF — c'est une décision produit assumée (cf. rapport
   * §BUG-02) : à revenu égal, la micro-entreprise peut rester plus favorable
   * que le portage. Les gabarits doivent traiter les deux signes.
   */
  laisseSurLaTable: number;
  /** Lecture prête à l'emploi du signe ci-dessus. */
  laisseSurLaTableSens: "gain" | "perte" | "neutre";
}

/* ————————————————————————— méta ————————————————————————— */

export interface MetaPayload {
  /** Identifiant unique de la simulation — sert aussi de clé d'idempotence. */
  simulationId: string;
  /** ISO 8601. */
  dateSimulation: string;
  /** Date lisible en français, prête à afficher. */
  dateSimulationLabel: string;
  source: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
    /** « meta_ads » / « direct » / … tel que dérivé du first touch. */
    leadSource?: string;
    device?: string;
  };
  /** Mentions légales obligatoires, déjà rédigées — à afficher telles quelles. */
  mentions: {
    valeurIndicative: string;
    politiqueConfidentialiteUrl: string;
    mentionsLegalesUrl: string;
  };
  /** Lien permanent vers le dossier web (artefact visuel). */
  dossierUrl?: string;
}

/* ————————————————————————— racine ————————————————————————— */

export interface SimulationResultPayload {
  version: typeof PAYLOAD_VERSION;
  identite: IdentitePayload;
  activite: ActivitePayload;
  foyer: FoyerPayload;
  avantages: AvantagesPayload;
  resultats: ResultatsPayload;
  meta: MetaPayload;
}

/** Mention légale unique, réutilisée partout (email, dossier, écran). */
export const MENTION_VALEUR_INDICATIVE =
  "Simulation à valeur indicative — ne constitue pas un conseil fiscal personnalisé.";
