import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";

import { extractCode, extractLink, waitForMessage, waitForSms } from "./support/mailpit";
import { closeFamily, createFamily, type Family } from "./support/family";
import { loginAs, loginViaApi, logoutFromShell, readApi } from "./support/session";

// Activation enseignant (C6) puis mot de passe oublié par email (LOT-2-AUTH, étape 2.2, P6).
// L'invitation du jeu de démo est à usage unique : parcours en série, sur le seul projet « bureau » (étiquette
// `@donnees-uniques`, exclue du projet « mobile » dans playwright.config.ts).
const INVITED = "nadia.houngbo@steamy.test";

test.describe.configure({ mode: "serial" });

test.describe("activation enseignante", { tag: "@donnees-uniques" }, () => {
  let activationLink = "";

  test("une enseignante invitée active son compte depuis le lien de l'email", async ({ page }) => {
    const invitation = await waitForMessage(INVITED, { contains: "Activez votre compte" });
    const link = extractLink(invitation, "/activation");
    // Jeton dans le fragment : jamais envoyé au serveur (journaux d'accès, en-tête Referer)
    expect(link.pathname).toBe("/activation");
    expect(link.hash).toMatch(/^#jeton=[\w-]+$/);
    activationLink = link.pathname + link.hash;
    const token = link.hash.slice("#jeton=".length);

    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url().split("#")[0])); // le fragment ne part jamais
    const response = await page.goto(activationLink);
    expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Activer votre compte");
    await expect(page).toHaveURL("/activation");
    expect(requests.filter((url) => url.includes(token))).toEqual([]);

    await expect(page.getByText(/n•*@steamy\.test|@steamy\.test/)).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(violations).toEqual([]);

    await page.getByLabel(/^Mot de passe/).fill("NadiaActive2026");
    await page.getByLabel(/^Confirmez le mot de passe/).fill("NadiaActive2026");
    await page.getByRole("button", { name: "Activer mon compte" }).click();
    await expect(page).toHaveURL("/enseignant");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Nadia");
    // WT01 : l'enseignante invitée n'a encore aucune classe (jeu D2), l'accueil l'invite à en créer une
    await expect(page.getByRole("heading", { level: 2, name: "Aucune classe pour l'instant" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Créer une classe" })).toHaveAttribute(
      "href",
      "/enseignant/classes/nouvelle",
    );
  });

  test("le lien d'activation déjà utilisé est refusé", async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(activationLink);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lien expiré ou déjà utilisé");
    await expect(page.getByRole("link", { name: "Contacter l'équipe Steamy" })).toBeVisible();
  });

  test("l'enseignante réinitialise son mot de passe par email (WL02-WL05)", async ({ page }) => {
    await page.goto("/mot-de-passe-oublie");
    await page.getByRole("button", { name: "Vous êtes enseignant ? Recevoir le code par email" }).click();
    const since = new Date();
    await page.getByRole("textbox", { name: /Adresse email/ }).fill(INVITED);
    await page.getByRole("button", { name: "Recevoir le code", exact: true }).click();
    await expect(page).toHaveURL("/mot-de-passe-oublie/code");
    const code = extractCode(await waitForMessage(INVITED, { since }));
    await page.getByLabel("Code à 6 chiffres reçu par email").fill(code);
    await page.getByRole("button", { name: "Vérifier le code" }).click();
    await page.getByLabel(/^Nouveau mot de passe/).fill("NadiaReset2026");
    await page.getByLabel(/^Confirmez le mot de passe/).fill("NadiaReset2026");
    await page.getByRole("button", { name: "Enregistrer le mot de passe" }).click();
    await expect(page).toHaveURL("/mot-de-passe-oublie/termine");

    await page.goto("/connexion");
    await page.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill(INVITED);
    await page.getByLabel(/^Mot de passe/).fill("NadiaReset2026");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL("/enseignant");
  });

  test("l'enseignante change son mot de passe (WT08), se déconnecte puis se reconnecte avec le nouveau", async ({ page }) => {
    await loginViaApi(page, INVITED, "NadiaReset2026");
    await page.goto("/enseignant/parametres");
    await page.getByRole("button", { name: "Changer de mot de passe" }).click();
    await page.getByLabel("Mot de passe actuel").fill("NadiaReset2026");
    await page.getByLabel(/^Nouveau mot de passe/).fill("NadiaChange2026");
    await page.getByLabel(/^Confirmez votre nouveau mot de passe/).fill("NadiaChange2026");
    await page.getByRole("button", { name: "Mettre à jour le mot de passe" }).click();
    await expect(page.getByText("Votre mot de passe est mis à jour.")).toBeVisible();

    await logoutFromShell(page);
    await expect(page).toHaveURL("/connexion");
    await page.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill(INVITED);
    await page.getByLabel(/^Mot de passe/).filter({ visible: true }).fill("NadiaReset2026");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL("/connexion");
    await page.getByLabel(/^Mot de passe/).filter({ visible: true }).fill("NadiaChange2026");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL("/enseignant");
  });

  // --- LOT-5 étape 5.9 · parcours de bout en bout de l'enseignante activée (compte à usage unique) ---------------
  // Nadia (invitée par l'admin dans le jeu D2, activée plus haut) a un autre mot de passe depuis WT08.
  const NADIA_PASSWORD = "NadiaChange2026";
  let classroom = { id: 0, name: "" };

  /** Connexion de Nadia par W16 (l'écran de connexion lui-même), puis retour à l'accueil de son espace. */
  async function signInAsNadia(page: Page) {
    await page.goto("/connexion");
    await page.getByRole("textbox", { name: /Identifiant ou numéro/ }).fill(INVITED);
    await page.getByLabel(/^Mot de passe/).filter({ visible: true }).fill(NADIA_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL("/enseignant");
  }

  /** WT06 individuel par l'écran : renvoie le lien SMS reçu par le parent. */
  async function inviteByScreen(page: Page, classId: number, family: Family, firstName: string): Promise<URL> {
    const since = new Date();
    await page.goto(`/enseignant/eleves/ajouter?classe=${classId}`);
    await page.getByLabel(/^Prénom/).fill(firstName);
    await page.getByLabel(/^Nom/).fill("Complet");
    await page.getByRole("textbox", { name: /Téléphone du parent/ }).fill(family.parentPhone.replace("+229", ""));
    await page.getByRole("combobox", { name: /Lien de parenté/ }).selectOption({ index: 1 });
    await page.getByRole("button", { name: "Envoyer la demande" }).click();
    await expect(page).toHaveURL(new RegExp(`/enseignant/classes/${classId}(\\?confirmation=invitation)?$`));
    return extractLink(await waitForSms(family.parentPhone, { since }), "/consentement/");
  }

  /** Le parent ouvre le lien SMS dans son propre navigateur : la demande lui est rattachée et WPD05 s'ouvre. */
  async function parentPage(browser: Browser, family: Family, link: URL): Promise<Page> {
    const parent = await (await browser.newContext()).newPage();
    await loginViaApi(parent, family.parentPhone);
    await parent.goto(link.pathname);
    await expect(parent).toHaveURL(/\/parent\/consentements\/\d+$/);
    return parent;
  }

  test("Invitation complète : l'enseignante crée une classe, invite un élève, le parent accepte, l'élève est actif", async ({ page, browser }) => {
    await signInAsNadia(page);
    await expect(page.getByRole("heading", { level: 2, name: "Aucune classe pour l'instant" })).toBeVisible();

    // WT13 : création de la classe sur un parcours de l'offre
    await page.getByRole("link", { name: "Créer une classe" }).click();
    await expect(page).toHaveURL("/enseignant/classes/nouvelle");
    classroom = { id: 0, name: `Classe complète ${Date.now().toString(36)}` };
    await page.getByLabel(/Nom de la classe/).fill(classroom.name);
    await page.getByRole("radio").first().locator("xpath=ancestor::label").click();
    await page.getByRole("button", { name: "Créer la classe" }).click();
    await expect(page).toHaveURL(/\/enseignant\/classes\/\d+(\?confirmation=creee)?$/);
    classroom.id = Number(new URL(page.url()).pathname.split("/").pop());
    await expect(page.getByRole("heading", { level: 3, name: "Ajoutez vos premiers élèves" })).toBeVisible();

    // WT06 : la demande part au parent
    const family = await createFamily();
    try {
      const link = await inviteByScreen(page, classroom.id, family, "Kossi");
      await expect(
        page.getByRole("list", { name: "Invitations" }).getByRole("listitem").filter({ hasText: "Kossi Complet" }),
      ).toContainText("En attente du parent");

      // WPD05 : le parent crée l'identifiant de l'enfant et accepte
      const parent = await parentPage(browser, family, link);
      await expect(parent.getByText("Invitation de Nadia", { exact: false })).toBeVisible();
      await expect(parent.getByText(/couvert par l'établissement, sans paiement/)).toBeVisible();
      const form = parent.getByRole("form", { name: "Accepter l'invitation" });
      await form.getByRole("textbox", { name: /^Identifiant/ }).fill(`kossi.${Date.now().toString(36)}`);
      await form.getByLabel(/^Mot de passe initial/).fill("Robot2026x");
      await form.getByRole("button", { name: "Accepter l'invitation" }).click();
      await expect(parent).toHaveURL(/\/parent\?consentement=\d+$/);

      // WT04 : l'élève est actif ; WT12 : « a rejoint la classe »
      await page.goto(`/enseignant/classes/${classroom.id}`);
      await expect(
        page.getByRole("list", { name: "Élèves de la classe" }).getByRole("listitem").filter({ hasText: "Kossi Complet" }),
      ).toBeVisible();
      await expect(page.getByRole("list", { name: "Invitations" })).toHaveCount(0);
      await page.goto("/enseignant/notifications");
      await expect(page.getByText(/Kossi Complet a rejoint la classe/).first()).toBeVisible();
    } finally {
      await closeFamily(family);
    }
  });

  test("Compte existant (C11) : le parent rattache son enfant, parcours `source=classroom`, sans paiement", async ({ page, browser }) => {
    expect(classroom.id).toBeGreaterThan(0);
    const family = await createFamily({ childFirstName: "Yao" });
    try {
      await signInAsNadia(page);
      const link = await inviteByScreen(page, classroom.id, family, "Yao");
      const parent = await parentPage(browser, family, link);
      const choice = parent.getByRole("group", { name: "Yao a-t-il déjà un compte Steamy ?" });
      await choice.getByText("Rattacher Yao à la classe").click();
      await parent.getByRole("button", { name: "Accepter l'invitation" }).click();
      await expect(parent).toHaveURL(/\/parent\?consentement=\d+$/);

      await page.goto(`/enseignant/classes/${classroom.id}`);
      await expect(
        page.getByRole("list", { name: "Élèves de la classe" }).getByRole("listitem").filter({ hasText: "Yao Test" }),
      ).toBeVisible();
      // L'élève a le parcours de la classe, sans commande ni paiement
      const enrollments = (await family.childSession.get("/api/learning/enrollments/")) as {
        results: { source: string; status: string }[];
      };
      expect(enrollments.results.map((enrollment) => enrollment.source)).toContain("classroom");
    } finally {
      await closeFamily(family);
    }
  });

  test("Refus : le parent refuse, l'invitation passe « Refusée » dans WT04, notification dans WT12", async ({ page }) => {
    expect(classroom.id).toBeGreaterThan(0);
    const family = await createFamily();
    try {
      await signInAsNadia(page);
      const link = await inviteByScreen(page, classroom.id, family, "Ola");
      const token = link.pathname.split("/").pop() as string;
      const request = (await family.parentSession.post("/api/accounts/consent-requests/claim/", { token })) as { id: number };
      const [reason] = (await family.parentSession.get("/api/referentials/refusal-reasons/")) as { code: string }[];
      await family.parentSession.post(`/api/accounts/consent-requests/${request.id}/refuse/`, { reason: reason.code, note: "" });

      await page.goto(`/enseignant/classes/${classroom.id}`);
      await expect(
        page.getByRole("list", { name: "Invitations" }).getByRole("listitem").filter({ hasText: "Ola Complet" }),
      ).toContainText("Refusée");
      await page.goto("/enseignant/notifications");
      await expect(page.getByText(/Invitation refusée : Ola Complet/).first()).toBeVisible();
    } finally {
      await closeFamily(family);
    }
  });

  test("Cloisonnement : une seconde enseignante ne peut ouvrir ni la classe, ni l'élève, ni le parcours de Koffi (404)", async ({ page, browser }) => {
    // Les identifiants de Koffi, lus avec sa propre session
    const koffi = await (await browser.newContext()).newPage();
    await loginAs(koffi, "teacher");
    await koffi.goto("/enseignant/classes");
    const { results } = await readApi<{ results: { id: number; name: string; course: { slug: string } }[] }>(koffi, "/api/classrooms/");
    const robotics = results.find((entry) => entry.name === "4e B · Robotique")!;
    const members = await readApi<{ results: { status: string; learner: { id: number } | null }[] }>(
      koffi,
      `/api/classrooms/${robotics.id}/members/`,
    );
    const learnerId = members.results.find((member) => member.status === "active")!.learner!.id;
    await koffi.close();

    await signInAsNadia(page);
    await page.goto(`/enseignant/classes/${robotics.id}`);
    await expect(page.getByRole("heading", { level: 2, name: "Cette classe est introuvable" })).toBeVisible();
    await page.goto(`/enseignant/classes/${robotics.id}/modifier`);
    await expect(page.getByRole("heading", { level: 2, name: "Cette classe est introuvable" })).toBeVisible();
    await page.goto(`/enseignant/eleves/${learnerId}?classe=${robotics.id}`);
    await expect(page.getByRole("heading", { level: 2, name: "Cet élève est introuvable" })).toBeVisible();
    await page.goto(`/enseignant/parcours/${robotics.course.slug}`);
    await expect(page.getByRole("heading", { level: 2, name: "Ce contenu est introuvable" })).toBeVisible();
    // Aucun nom d'élève de Koffi n'apparaît dans les évaluations de Nadia
    await page.goto("/enseignant/evaluations");
    await expect(page.getByText("Yao Kpadé")).toHaveCount(0);
  });
});
