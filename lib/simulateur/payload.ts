/**
 * Construction du payload de récapitulatif (types/simulation-result.ts).
 *
 * Fonction PURE, utilisable côté serveur comme côté navigateur : c'est le
 * point de passage obligé entre l'état du simulateur et tout ce qui
 * l'affiche — écran de résultats, emails E1→E4, page /dossier.
 *
 * Application directe de la spec §4.3 : aucun libellé, aucun badge, aucune
 * mention n'est piloté par un état d'affichage séparé. « avantages inclus »
 * se lit sur `avantages.avantagesInclus`, qui est dérivé de la sélection
 * réelle — c'est ce qui empêche BUG-04 de réapparaître.
 */
import { CAGNOTTE_PROVIDERS, cagnotteNet, RD_PORTAGE_2026 } from "@/config/fiscal-2026";
import { computeIr } from "@/lib/fiscal/ir";
import type { computePortage } from "@/lib/fiscal/portage";
import type { SimulationResult } from "@/lib/fiscal/scenarios";
import {
  MENTION_VALEUR_INDICATIVE,
  PAYLOAD_VERSION,
  type AvantagePayload,
  type AvantagesPayload,
  type ProfilUtilisateur,
  type SimulationResultPayload,
} from "@/types/simulation-result";
import { activeBracket, resolvedTjm, type FormState } from "./state";

/* ————————————————————————— libellés dérivés ————————————————————————— */

export function profilOf(form: FormState): { id: ProfilUtilisateur; label: string } {
  if (form.impatrie) return { id: "impatrie", label: "Impatrié (arrivé en France pour ce poste)" };
  switch (form.status) {
    case "porte_ailleurs":
      return { id: "deja_porte", label: "Déjà en portage" };
    case "salarie_esn":
      return { id: "salarie_esn", label: "Salarié en ESN" };
    case "transition":
      return { id: "reconversion", label: "En reconversion / transition" };
    default:
      return { id: "consultant_freelance", label: "Consultant freelance" };
  }
}

/**
 * Avantages réellement sélectionnés. Renvoie une liste VIDE quand
 * l'utilisateur n'a rien retenu — et c'est cette liste, et elle seule, qui
 * pilote la mention « avantages inclus ».
 */
export function buildAvantages(form: FormState, mealVoucherCredit: number): AvantagesPayload {
  const selection: AvantagePayload[] = [];

  if (form.cagnotte !== "aucune") {
    const provider = CAGNOTTE_PROVIDERS[form.cagnotte];
    const brut = provider.defaultMonthly;
    const net = cagnotteNet(form.cagnotte, brut);
    selection.push({
      id: provider.id,
      label: provider.label,
      montantBrutMensuel: Math.round(brut),
      montantNetMensuel: Math.round(net),
      montantNetAnnuel: Math.round(net * 12),
      fraisDeService:
        provider.feeRate === 0 && provider.annualFee === 0
          ? "sans frais de service"
          : `${provider.annualFee} €/an + ${(provider.feeRate * 100).toFixed(1).replace(".", ",")} %`,
    });
  }

  const tr = form.titresResto ? Math.round(mealVoucherCredit) : 0;
  if (form.titresResto && tr > 0) {
    selection.push({
      id: "titres_resto",
      label: "Titres-restaurant",
      montantBrutMensuel: tr,
      montantNetMensuel: tr,
      montantNetAnnuel: tr * 12,
      fraisDeService: "sans frais de service",
    });
  }

  const totalNetMensuel = selection.reduce((sum, a) => sum + a.montantNetMensuel, 0);
  return {
    selection,
    totalNetMensuel,
    totalNetAnnuel: totalNetMensuel * 12,
    titresResto: { inclus: form.titresResto && tr > 0, creditMensuel: tr },
    // L'unique source de vérité de la mention « avantages inclus ».
    avantagesInclus: selection.length > 0,
  };
}

/* ————————————————————————— payload complet ————————————————————————— */

export interface PayloadContext {
  identite: { prenom: string; email: string; telephone?: string };
  simulationId: string;
  dateSimulation?: string;
  source?: SimulationResultPayload["meta"]["source"];
  dossierUrl?: string;
  baseUrl?: string;
}

export function buildPayload(
  form: FormState,
  result: SimulationResult,
  live: ReturnType<typeof computePortage>,
  ctx: PayloadContext,
): SimulationResultPayload {
  const profil = profilOf(form);
  const bracket = activeBracket(form);
  const tjm = resolvedTjm(form);
  const optimise = result.scenarios[2];
  const avantages = buildAvantages(form, live.mealVoucherCredit);

  // Parts fiscales : relues depuis le moteur IR plutôt que recalculées ici,
  // pour qu'il n'existe qu'une seule définition du quotient familial.
  const ir = computeIr({
    household: { maritalStatus: form.situation, children: form.enfants, childrenGardeAlternee: form.gardeAlternee },
    salaryTaxable: live.netTaxable * 12,
    autresRevenus: form.situation === "marie_pacse" ? form.revenuConjoint : undefined,
    fraisReels: form.useFraisReels ? form.fraisReels : undefined,
    versementsPER: form.per || undefined,
    dons: form.dons || undefined,
    revenusFonciers: form.foncier || undefined,
    impatrie: form.impatrie || undefined,
  });

  const date = ctx.dateSimulation ? new Date(ctx.dateSimulation) : new Date();
  const ecart = result.economieAnnuelleEur;
  const base = ctx.baseUrl ?? "";

  return {
    version: PAYLOAD_VERSION,
    identite: {
      prenom: ctx.identite.prenom,
      email: ctx.identite.email,
      telephone: ctx.identite.telephone,
      profil: profil.id,
      profilLabel: profil.label,
    },
    activite: {
      tjm,
      tjmMode: form.tjmMode,
      tjmFourchette:
        form.tjmMode === "fourchette"
          ? { id: bracket.id, label: bracket.label, min: bracket.min, max: bracket.max, mediane: bracket.mediane }
          : undefined,
      joursFactures: form.days,
      joursFacturesAnnuels: form.days * 12,
      fraisProMensuels: form.fraisMensuels,
    },
    foyer: {
      situation: form.situation,
      situationLabel: form.situation === "marie_pacse" ? "Marié·e ou pacsé·e" : "Célibataire / seul·e",
      nombreDeParts: ir.parts,
      enfants: form.enfants,
      enfantsGardeAlternee: form.gardeAlternee,
      revenuConjoint: form.situation === "marie_pacse" ? form.revenuConjoint : 0,
      modeDeduction: form.useFraisReels ? "frais_reels" : "forfait_10",
      modeDeductionLabel: form.useFraisReels ? "Frais réels" : "Abattement forfaitaire 10 %",
      fraisReelsAnnuels: form.useFraisReels ? form.fraisReels : 0,
      per: form.per,
      autresRevenus: { foncier: form.foncier, dons: form.dons },
    },
    avantages,
    resultats: {
      mensuel: {
        caHt: live.fees,
        fraisDeGestion: live.managementFee,
        assurancesTaxes: live.insuranceTax,
        fraisPro: live.ndf,
        cagnotte: live.cagnotteMay,
        disponible: live.available,
        brut: live.grossSalary,
        cotisationsSalariales: live.employeeContributions,
        netVerse: live.netSalary,
        titresResto: live.mealVoucherCredit,
        percuNet: live.netPerceived,
        remunerationGlobale: live.globalCompensation,
      },
      tauxRestitution: live.restitutionRate,
      netImposableAnnuel: Math.round(live.netTaxable * 12),
      impotNet: optimise.tax,
      tauxMoyenImposition: optimise.averageTaxRate,
      tmi: optimise.marginalRate,
      scenarios: result.scenarios.map((s) => ({
        id: s.id,
        label: s.label,
        caHt: s.grossInflow,
        netPercu: s.netPerceived,
        avantages: s.benefits,
        impotFoyer: s.tax,
        disponible: s.disposable,
        tauxMoyenImposition: s.averageTaxRate,
        tmi: s.marginalRate,
      })),
      laisseSurLaTable: ecart,
      laisseSurLaTableSens: ecart > 0 ? "gain" : ecart < 0 ? "perte" : "neutre",
    },
    meta: {
      simulationId: ctx.simulationId,
      dateSimulation: date.toISOString(),
      dateSimulationLabel: date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
      source: ctx.source ?? {},
      mentions: {
        valeurIndicative: MENTION_VALEUR_INDICATIVE,
        politiqueConfidentialiteUrl: `${base}/confidentialite`,
        mentionsLegalesUrl: `${base}/mentions-legales`,
      },
      dossierUrl: ctx.dossierUrl,
    },
  };
}

/** Frais de gestion RD, exposé pour les gabarits (évite un import de config). */
export const MANAGEMENT_FEE_RATE = RD_PORTAGE_2026.managementFeeRate;
