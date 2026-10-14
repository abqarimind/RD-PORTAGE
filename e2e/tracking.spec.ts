/**
 * GARDE-FOU DU TRACKING — parcours complet depuis un lien de pub, sur iPhone,
 * consentement accepté puis refusé.
 *
 * Vérifie, à partir des requêtes réellement émises par le navigateur :
 *  - Meta : quels événements partent, dans quel ordre, une seule fois chacun,
 *    uniquement avec des paramètres autorisés, et rien du tout en cas de refus ;
 *  - Plausible : les objectifs partent dans les deux cas, avec `angle` et
 *    `utm_content` pour seules propriétés, et des URL réduites aux UTM ;
 *  - aucune donnée financière, familiale ou personnelle dans ces requêtes ;
 *  - /api/lead reçoit les UTM, le fbclid et le téléphone.
 */
import { expect, test, type Page } from "@playwright/test";
import { installStubs, type Captured } from "./stubs";

const AD_URL =
  "/?utm_source=meta&utm_medium=paid_social&utm_campaign=Test_E2E&utm_content=B_Foyer_s04&fbclid=E2E_FBCLID&igsh=param_inconnu";

const PRENOM = "Testeur";
const EMAIL = "e2e@example.com";

/** Ce qui ne doit JAMAIS apparaître dans une requête vers Meta ou Plausible. */
const INTERDIT: RegExp[] = [
  new RegExp(PRENOM, "i"),
  /e2e@example\.com|e2e%40example/i,
  /612345678/,
  /500[\s_-]*(à|%C3%A0|a)?[\s_-]*650/i,
  /\btjm\b/i,
  /€|%E2%82%AC/i,
  /revenu/i,
  /imp[oô]t|imp%C3%B4t/i,
  /enfant/i,
  /garde/i,
  /situation/i,
  /celibataire|marie_pacse/i,
];

function attendreEvenement(captured: Captured, nom: string) {
  return expect.poll(() => captured.plausible.some((h) => h.n === nom), { message: `objectif Plausible ${nom}` }).toBe(true);
}

async function parcoursJusquAuLead(page: Page, captured: Captured, choix: "Accepter" | "Refuser") {
  await page.goto(AD_URL);

  // Bannière compacte : elle ne doit pas manger l'écran.
  const banniere = page.getByTestId("consent-banner");
  await expect(banniere).toBeVisible();
  const box = await banniere.boundingBox();
  expect(box!.height, "hauteur de la bannière cookies (px)").toBeLessThanOrEqual(160);
  await banniere.getByRole("button", { name: choix, exact: true }).click();
  await expect(banniere).toBeHidden();

  // Le paramètre inconnu a été retiré de l'URL, les UTM et le fbclid sont restés.
  await expect.poll(() => page.url()).not.toContain("igsh");
  expect(page.url()).toContain("utm_content=B_Foyer_s04");

  // Diagnostic flash.
  const diag = page.locator("#diagnostic");
  await diag.getByRole("button", { name: "Freelance", exact: true }).click();
  await diag.getByRole("button", { name: "500 à 650 €" }).click();
  await diag.getByRole("button", { name: "Non", exact: true }).click();
  await expect(diag.getByText("Estimation immédiate")).toBeVisible();
  await diag.getByRole("link", { name: /Calculer mon vrai taux/ }).click();

  // Simulateur : profil et TJM repris du diagnostic.
  await expect(page).toHaveURL(/\/simulateur/);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Voir mon résultat" }).click();
  await page.getByRole("button", { name: /Recevoir mon dossier complet/ }).click();

  // Formulaire : téléphone obligatoire.
  await page.getByLabel("Votre prénom").fill(PRENOM);
  await page.getByLabel("Votre téléphone").fill("06 12 34 56 78");
  await page.getByLabel("Votre email").fill(EMAIL);
  const reponse = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/lead");
  await page.getByRole("button", { name: "Recevoir mon dossier" }).click();
  expect((await reponse).status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Votre dossier est disponible" })).toBeVisible();
  await attendreEvenement(captured, "lead_submitted");
}

function verifierAucuneDonneeSensible(captured: Captured) {
  const textes = [
    ...captured.meta.map((h) => `${h.ev} ${h.dl} ${JSON.stringify(h.params)}`),
    ...captured.plausible.map((h) => h.raw),
  ];
  for (const t of textes) {
    for (const motif of INTERDIT) expect(t, `donnée interdite ${motif} dans une requête de mesure`).not.toMatch(motif);
  }
}

function verifierPlausible(captured: Captured) {
  const objectifs = captured.plausible.filter((h) => h.n !== "pageview").map((h) => h.n);
  expect(objectifs).toEqual(["diag_started", "diag_completed", "sim_started", "sim_completed", "lead_submitted"]);
  for (const h of captured.plausible.filter((x) => x.n !== "pageview")) {
    expect(Object.keys(h.p ?? {}).sort()).toEqual(["angle", "utm_content"]);
    expect(h.p).toEqual({ angle: "lp_b", utm_content: "B_Foyer_s04" });
  }
  // URL envoyées : chemin + UTM, jamais le fbclid, l'étape du simulateur ni un paramètre inconnu.
  const pageviews = captured.plausible.filter((h) => h.n === "pageview");
  expect(pageviews.length).toBeGreaterThan(0);
  for (const pv of pageviews) {
    const u = new URL(pv.u);
    for (const k of u.searchParams.keys()) expect(k).toMatch(/^utm_(source|medium|campaign|content|term)$/);
  }
}

function verifierPayloadLead(captured: Captured) {
  expect(captured.leadPayloads).toHaveLength(1);
  const lead = captured.leadPayloads[0] as {
    identity: { phone: string; first_name: string; email: string };
    attribution: { first_touch: Record<string, string>; lead_source: string; device: string };
    journey: { angle: string; last_step: string };
  };
  expect(lead.identity).toMatchObject({ phone: "+33612345678", first_name: PRENOM, email: EMAIL });
  expect(lead.attribution.first_touch).toMatchObject({
    utm_source: "meta",
    utm_medium: "paid_social",
    utm_campaign: "Test_E2E",
    utm_content: "B_Foyer_s04",
    fbclid: "E2E_FBCLID",
    landing_path: "/",
  });
  expect(lead.attribution.lead_source).toBe("froid_ads");
  expect(lead.attribution.device).toBe("mobile");
  expect(lead.journey).toMatchObject({ angle: "lp_b", last_step: "inscription" });
}

test.describe("consentement accepté", () => {
  test("chaque événement Meta part une fois, dans l'ordre, sans donnée interdite", async ({ page, context }) => {
    const captured = await installStubs(page);
    await parcoursJusquAuLead(page, captured, "Accepter");
    await expect.poll(() => captured.meta.some((h) => h.ev === "Lead")).toBe(true);

    const ordre = captured.meta.map((h) => h.ev);
    expect(ordre).toEqual([
      "PageView",
      "ViewContent",
      "DiagnosticFlashStart",
      "DiagnosticFlashComplete",
      "PageView",
      "SimulateurFoyerComplete",
      "Lead",
    ]);
    // Un PageView par page, pas un de plus.
    expect(captured.meta.filter((h) => h.ev === "PageView").map((h) => new URL(h.dl).pathname)).toEqual(["/", "/simulateur"]);

    // Paramètres : liste blanche, valeurs techniques.
    for (const h of captured.meta) {
      for (const k of Object.keys(h.params)) expect(["content_name", "step", "from"]).toContain(k);
    }
    expect(captured.meta.find((h) => h.ev === "ViewContent")!.params).toEqual({ content_name: "lp_b" });
    expect(captured.meta.find((h) => h.ev === "Lead")!.params).toEqual({ content_name: "simulateur_dossier" });
    // Chaque événement a son propre identifiant (déduplication CAPI future).
    expect(new Set(captured.meta.map((h) => h.eid)).size).toBe(captured.meta.length);

    // Le fbclid de la pub est devenu le cookie _fbc après consentement.
    const fbc = (await context.cookies()).find((c) => c.name === "_fbc");
    expect(fbc?.value).toMatch(/^fb\.\d\.\d+\.E2E_FBCLID$/);

    verifierPlausible(captured);
    verifierAucuneDonneeSensible(captured);
    verifierPayloadLead(captured);

    // Clic « Nous contacter » (tel:) : Contact Meta et contact_click Plausible.
    await page.getByRole("link", { name: "Nous contacter" }).first().click({ noWaitAfter: true });
    await attendreEvenement(captured, "contact_click");
    await expect.poll(() => captured.meta.filter((h) => h.ev === "Contact").length).toBe(1);
    expect(captured.meta.find((h) => h.ev === "Contact")!.params).toEqual({ from: "sim_unlocked_tel" });
  });

  test("une fourchette restaurée à la visite suivante ne renvoie pas DiagnosticFlashComplete", async ({ page, context }) => {
    const captured = await installStubs(page);
    await page.goto(AD_URL);
    await page.getByTestId("consent-banner").getByRole("button", { name: "Accepter", exact: true }).click();
    const diag = page.locator("#diagnostic");
    await diag.getByRole("button", { name: "Freelance", exact: true }).click();
    await diag.getByRole("button", { name: "500 à 650 €" }).click();
    await diag.getByRole("button", { name: "Non", exact: true }).click();
    await expect.poll(() => captured.meta.filter((h) => h.ev === "DiagnosticFlashComplete").length).toBe(1);

    // Nouvel onglet = nouvelle session ; les réponses sont restaurées depuis l'appareil.
    const second = await context.newPage();
    const captured2 = await installStubs(second);
    await second.goto("/");
    await expect(second.locator("#diagnostic").getByText("Estimation immédiate")).toBeVisible();
    await expect.poll(() => captured2.meta.some((h) => h.ev === "PageView")).toBe(true);
    await second.waitForTimeout(1_000);
    expect(captured2.meta.map((h) => h.ev)).not.toContain("DiagnosticFlashComplete");
  });
});

test.describe("consentement refusé", () => {
  test("rien ne part vers Meta, la mesure sans cookie reste complète", async ({ page, context }) => {
    const captured = await installStubs(page);
    await parcoursJusquAuLead(page, captured, "Refuser");
    await page.waitForTimeout(1_000);

    expect(captured.metaRequests, "aucune requête vers Meta, script compris").toEqual([]);
    const cookies = (await context.cookies()).map((c) => c.name);
    expect(cookies).not.toContain("_fbp");
    expect(cookies).not.toContain("_fbc");

    verifierPlausible(captured);
    verifierAucuneDonneeSensible(captured);
    verifierPayloadLead(captured);
  });
});

test.describe("garde-fous du formulaire et des pages", () => {
  test("un téléphone invalide est refusé avant tout envoi", async ({ page }) => {
    const captured = await installStubs(page);
    await page.goto("/");
    await page.getByTestId("consent-banner").getByRole("button", { name: "Refuser", exact: true }).click();
    const diag = page.locator("#diagnostic");
    await diag.getByRole("button", { name: "Freelance", exact: true }).click();
    await diag.getByRole("button", { name: "500 à 650 €" }).click();
    await diag.getByRole("button", { name: "Non", exact: true }).click();
    await diag.getByRole("link", { name: /Calculer mon vrai taux/ }).click();
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByRole("button", { name: "Voir mon résultat" }).click();
    await page.getByRole("button", { name: /Recevoir mon dossier complet/ }).click();
    await page.getByLabel("Votre prénom").fill(PRENOM);
    await page.getByLabel("Votre téléphone").fill("06 12");
    await page.getByLabel("Votre email").fill(EMAIL);
    await page.getByRole("button", { name: "Recevoir mon dossier" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Numéro invalide" })).toBeVisible();
    expect(captured.leadPayloads).toHaveLength(0);
  });

  test("le serveur refuse un lead sans téléphone valide", async ({ request }) => {
    const res = await request.post("/api/lead", {
      data: {
        identity: { first_name: PRENOM, email: EMAIL, phone: "12" },
        profile: { statut_actuel: "freelance_micro", tjm_ou_ca: 500, jours_factures: 20, foyer: { situation: "celibataire", enfants: 0, garde_alternee: 0 } },
        simulation: { inputs: {}, scenarios: [], economie_annuelle_eur: 0, completed: true },
        consent: { marketing_optin: false, timestamp: new Date().toISOString(), policy_version: "privacy-2026-10" },
        attribution: {
          first_touch: { timestamp: new Date().toISOString() },
          last_touch: { timestamp: new Date().toISOString() },
          lead_source: "direct",
          device: "mobile",
        },
      },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe("invalid_phone");
  });

  test("le lien de dossier n'est jamais transmis à la mesure d'audience", async ({ page }) => {
    const captured = await installStubs(page);
    await page.goto("/dossier?d=abc&s=def");
    await expect.poll(() => captured.plausible.length).toBeGreaterThan(0);
    for (const h of captured.plausible) {
      expect(new URL(h.u).search).toBe("");
      expect(h.raw).not.toContain("d=abc");
    }
    expect(captured.metaRequests).toEqual([]);
  });
});
