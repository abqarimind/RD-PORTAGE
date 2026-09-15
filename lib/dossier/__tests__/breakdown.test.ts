import { describe, expect, it } from "vitest";
import { makePayload } from "@/lib/email/__tests__/fixtures";
import {
  buildCascadeBars,
  buildCascadeSteps,
  buildPartage,
  derivePaie,
  type CascadeStep,
} from "@/lib/dossier/breakdown";

/**
 * Le dossier promet « rien n'est arrondi en votre faveur ». Une cascade qui
 * ne boucle pas casse cette promesse en silence : les paliers étant dessinés
 * depuis zéro, un pas manquant ne se voit pas à l'écran.
 */

/** Les variantes qui changent la forme de la cascade (pas juste les montants). */
const CAS = [
  { nom: "cas nominal (cagnotte + titres-restaurant)", patch: {} },
  { nom: "sans titres-restaurant", patch: { titresResto: false } },
  { nom: "sans cagnotte", patch: { cagnotte: "aucune" as const } },
  { nom: "avec frais professionnels", patch: { fraisMensuels: 400 } },
  { nom: "sans aucun avantage", patch: { titresResto: false, cagnotte: "aucune" as const } },
  { nom: "salarié en ESN", patch: { status: "salarie_esn" as const } },
  { nom: "TJM par fourchette", patch: { tjmMode: "fourchette" as const, tjmBracketId: "500-650" } },
];

describe("cascade du dossier", () => {
  it.each(CAS)("boucle sans écart — $nom", ({ patch }) => {
    const payload = makePayload(patch);
    const { bars, ecarts } = buildCascadeBars(buildCascadeSteps(payload));

    expect(ecarts).toEqual([]);
    // La dernière marche tombe exactement sur le perçu net du contrat.
    expect(bars[bars.length - 1].running).toBe(payload.resultats.mensuel.percuNet);
  });

  it("compte la part entreprise des titres-restaurant, pas la valeur faciale", () => {
    const payload = makePayload();
    const m = payload.resultats.mensuel;
    const ligne = buildCascadeSteps(payload).find((s) => s.label.startsWith("Titres-restaurant"));

    expect(ligne).toBeDefined();
    // Régression : la version précédente affichait `m.titresResto` (la face
    // complète), alors que la moitié sort du net du salarié. L'écart passait
    // inaperçu parce que le palier final était redessiné depuis zéro.
    expect(ligne!.delta).toBeLessThan(m.titresResto);
    expect(ligne!.delta).toBe(m.percuNet - (m.brut - m.cotisationsSalariales) - m.fraisPro);
  });

  it("aurait signalé l'ancienne erreur au lieu de la masquer", () => {
    const payload = makePayload();
    const m = payload.resultats.mensuel;
    const ancienne: CascadeStep[] = buildCascadeSteps(payload).map((s) =>
      s.label.startsWith("Titres-restaurant") ? { ...s, delta: m.titresResto } : s,
    );

    const { ecarts } = buildCascadeBars(ancienne);
    expect(ecarts).toHaveLength(1);
    expect(ecarts[0]).toContain("Perçu net");
  });

  it("rembourse les frais professionnels avancés plus bas dans la cascade", () => {
    const steps = buildCascadeSteps(makePayload({ fraisMensuels: 400 }));
    const avance = steps.find((s) => s.label === "Frais professionnels avancés");
    const rembourse = steps.find((s) => s.label === "Frais professionnels remboursés");

    expect(avance!.delta).toBeLessThan(0);
    expect(rembourse!.delta).toBe(-avance!.delta);
  });

  it("n'affiche aucune ligne à zéro", () => {
    for (const { patch } of CAS) {
      const steps = buildCascadeSteps(makePayload(patch));
      expect(steps.filter((s) => s.delta === 0 && !s.total)).toEqual([]);
    }
  });
});

describe("partage du CA", () => {
  it.each(CAS)("les trois blocs totalisent exactement le CA HT — $nom", ({ patch }) => {
    const payload = makePayload(patch);
    const { parts } = buildPartage(payload);

    const somme = parts.reduce((acc, p) => acc + p.value, 0);
    expect(somme).toBe(payload.resultats.mensuel.caHt);
    expect(parts.every((p) => p.value >= 0)).toBe(true);
  });

  it.each(CAS)("se raccorde à la rémunération globale affichée — $nom", ({ patch }) => {
    const payload = makePayload(patch);
    const { pourVous, partEntrepriseTR } = derivePaie(payload);

    // C'est ce que dit la mention sous la barre : la part qui revient, plus
    // les titres-restaurant financés par l'entreprise, fait la rémunération
    // globale de la tuile d'en-tête. Les deux chiffres doivent se rejoindre.
    expect(pourVous + partEntrepriseTR).toBe(payload.resultats.mensuel.remunerationGlobale);
  });

  it("une seule marque porte l'accent", () => {
    const { parts } = buildPartage(makePayload());
    expect(parts.filter((p) => p.accent)).toHaveLength(1);
  });
});
