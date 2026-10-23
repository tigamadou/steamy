import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { DEMO_PASSWORD } from "../support/demo";
import { uniqueSuffix } from "../support/api";
import { loginAs, loginViaApi, readApi } from "../support/session";

// LOT-5 étape 5.4 · profil d'un élève et commentaires (WT05).

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

type Dashboard = { toReview: { id: number; learner: { id: number; firstName: string; lastName: string }; classroom: { id: number } }[] };

// Un commentaire sort la tentative de « À revoir » : le parcours consomme la tentative échouée du jeu D2, joué une
// seule fois, sur « bureau »
test.describe("commenter une tentative échouée", { tag: "@donnees-uniques" }, () => {
  test("WT01 → WT05 : la tentative sort de « À revoir », l'apprenant et le parent voient le commentaire", async ({ page }) => {
    await loginAs(page, "teacher");
    await page.goto("/enseignant");
    const before = await readApi<Dashboard>(page, "/api/classrooms/dashboard/");
    const target = before.toReview.find((review) => review.learner.firstName === "Yao") ?? before.toReview[0];
    const name = `${target.learner.firstName} ${target.learner.lastName}`;

    // « Commenter » ouvre WT05 sur la tentative ciblée
    await page.getByRole("link", { name: new RegExp(`^Commenter la tentative de ${name}`) }).first().click();
    await expect(page).toHaveURL(`/enseignant/eleves/${target.learner.id}?classe=${target.classroom.id}&tentative=${target.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Profil de l'élève");
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /À propos de la tentative/ })).toHaveValue(String(target.id));
    await expect(page.getByText("Visible par l'élève et son parent, qui en sont notifiés.")).toBeVisible();
    // Aucune donnée sensible, pas de « Message au parent »
    await expect(page.getByText(/\d+ ans|téléphone|Message au parent|naissance|handicap/i)).toHaveCount(0);
    await axe(page);

    const comment = `Revoyez le câblage des moteurs (${uniqueSuffix()}).`;
    await page.getByRole("textbox", { name: /Commentaire/ }).fill(comment);
    await page.getByRole("button", { name: "Envoyer le commentaire" }).click();
    await expect(page.getByText("Commentaire envoyé.")).toBeVisible();
    await expect(page.getByRole("list", { name: "Commentaires envoyés" })).toContainText(comment);
    await expect(page.getByRole("list", { name: "Tentatives de l'élève" }).getByText("Commentée").first()).toBeVisible();

    // Elle n'est plus dans « À revoir »
    const after = await readApi<Dashboard>(page, "/api/classrooms/dashboard/");
    expect(after.toReview.map((review) => review.id)).not.toContain(target.id);

    // L'apprenant est notifié (WD04) ; le parent lit le commentaire de l'enseignant sur son enfant (WPD03). Les profils
    // du jeu D2 n'étant pas tous complets (le parent de Yao n'a pas fini son inscription), la lecture passe par l'API.
    const accounts: Record<string, { learner: string; parent: string }> = {
      Yao: { learner: "yao.kpade", parent: "+2290190000002" },
      "Sèna": { learner: "sena.kpade", parent: "+2290190000002" },
      "Léa": { learner: "lea.adjovi", parent: "+2290190000001" },
    };
    const account = accounts[target.learner.firstName];
    expect(account, `compte de démonstration de ${name}`).toBeDefined();

    await page.context().clearCookies();
    await loginViaApi(page, account.learner, DEMO_PASSWORD);
    const notifications = await readApi<{ results: { type: string; message: string }[] }>(page, "/api/notifications/?pageSize=50");
    expect(notifications.results.some((item) => item.type === "classroom.comment" && item.message.includes(comment))).toBe(true);

    await page.context().clearCookies();
    await loginViaApi(page, account.parent);
    const comments = await readApi<{ results: { body: string }[] }>(
      page,
      `/api/classrooms/comments/?learnerId=${target.learner.id}`,
    );
    expect(comments.results.map((item) => item.body)).toContain(comment);
  });
});

test("WT05 : le profil d'un élève de la classe, sans commentaire en trop ; un élève hors de la classe demandée est introuvable (404)", async ({ page }) => {
  await loginAs(page, "teacher");
  await page.goto("/enseignant/classes");
  const robotics = String(
    await page.getByRole("list", { name: "Mes classes" }).getByRole("link", { name: /4e B · Robotique/ }).getAttribute("href"),
  ).split("/").pop() as string;
  const code = String(
    await page.getByRole("list", { name: "Mes classes" }).getByRole("link", { name: /3e A · Code/ }).getAttribute("href"),
  ).split("/").pop() as string;
  const members = await readApi<{ results: { status: string; learner: { id: number } | null }[] }>(
    page,
    `/api/classrooms/${robotics}/members/`,
  );
  const learner = members.results.find((member) => member.status === "active")!.learner!.id;

  await page.goto(`/enseignant/eleves/${learner}?classe=${robotics}`);
  await expect(page.getByRole("heading", { level: 2, name: /Progression sur/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Mes classes" }).first()).toHaveAttribute("href", "/enseignant/classes");
  await axe(page);

  // Cet élève n'est pas dans la classe « 3e A · Code » ; un identifiant inconnu non plus
  await page.goto(`/enseignant/eleves/${learner}?classe=${code}`);
  await expect(page.getByRole("heading", { level: 2, name: "Cet élève est introuvable" })).toBeVisible();
  await page.goto("/enseignant/eleves/999999");
  await expect(page.getByRole("heading", { level: 2, name: "Cet élève est introuvable" })).toBeVisible();
  await page.goto("/enseignant/eleves/abc");
  await expect(page.getByRole("heading", { level: 2, name: "Cet élève est introuvable" })).toBeVisible();
});
