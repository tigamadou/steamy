import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { uniquePhone, uniqueSuffix } from "./support/api";
import { loginAs, readApi, writeApi } from "./support/session";

// LOT-5 étape 5.2 · mes classes (WT03), créer et modifier une classe (WT13), élèves d'une classe (WT04).

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

type School = { classroomsLeft: number; classroomsUsed: number; classroomQuota: number; courses: { slug: string; title: string }[] };
type Classroom = { id: number; name: string; memberCount: number; pendingInvitationCount: number };

test("WT03 : les classes de Koffi, le quota de l'école et « Créer une classe »", async ({ page }) => {
  await loginAs(page, "teacher");
  await page.goto("/enseignant/classes");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mes classes");
  const { results } = await readApi<{ results: Classroom[] }>(page, "/api/classrooms/");
  const school = await readApi<School>(page, "/api/classrooms/school/");

  const list = page.getByRole("list", { name: "Mes classes" });
  await expect(list.getByRole("listitem")).toHaveCount(results.length);
  await expect(list.getByRole("link", { name: /4e B · Robotique/ })).toHaveAttribute("href", /^\/enseignant\/classes\/\d+$/);
  const quota = page.getByRole("complementary", { name: "Quota de l'offre" });
  await expect(quota).toContainText(`${school.classroomsUsed} / ${school.classroomQuota}`);
  await expect(page.getByRole("link", { name: "Créer une classe" })).toHaveAttribute("href", "/enseignant/classes/nouvelle");
  await axe(page);
});

test("WT13 : erreur serveur « nom déjà pris » affichée au champ, sans créer de classe", async ({ page }) => {
  await loginAs(page, "teacher");
  await page.goto("/enseignant/classes/nouvelle");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Créer une classe");
  await page.getByLabel(/Nom de la classe/).fill("4e B · Robotique");
  // Radios natives masquées : on clique le libellé visible du premier parcours
  await page.getByText(/· \d+ h$/).first().click();
  await page.getByRole("button", { name: "Créer la classe" }).click();
  await expect(page.getByText("Une classe porte déjà ce nom dans votre établissement.").filter({ visible: true }).first()).toBeVisible();
  await expect(page).toHaveURL("/enseignant/classes/nouvelle");
  await axe(page);
  await page.getByRole("link", { name: "Annuler" }).click();
  await expect(page).toHaveURL("/enseignant/classes");
});

// Une classe créée consomme le quota de l'école : jouée une seule fois, sur « bureau »
test.describe("création d'une classe", { tag: "@donnees-uniques" }, () => {
  test("WT13 → WT04 vide → invitation → annulation de l'invitation, quota libéré", async ({ page }) => {
    await loginAs(page, "teacher");
    await page.goto("/enseignant/classes/nouvelle");
    const name = `Classe e2e ${uniqueSuffix()}`;
    await page.getByLabel(/Nom de la classe/).fill(name);
    // Radios natives masquées : on clique le libellé visible du premier parcours
    await page.getByText(/· \d+ h$/).first().click();
    await page.getByRole("combobox", { name: /Niveau scolaire/ }).selectOption({ index: 1 });
    await page.getByRole("button", { name: "Créer la classe" }).click();

    // WT04 de la nouvelle classe, vide, avec la confirmation puis le CTA vers WT06
    await expect(page).toHaveURL(/\/enseignant\/classes\/\d+(\?confirmation=creee)?$/);
    await expect(page.getByRole("heading", { level: 2, name: name })).toBeVisible();
    await expect(page.getByText("La classe est créée.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Ajoutez vos premiers élèves" })).toBeVisible();
    const id = Number(new URL(page.url()).pathname.split("/").pop());
    await expect(page.getByRole("link", { name: "Ajouter des élèves" }).filter({ visible: true }).first()).toHaveAttribute(
      "href",
      `/enseignant/eleves/ajouter?classe=${id}`,
    );
    await axe(page);

    // Modifier : renommer, le parcours restant libre tant qu'aucun élève n'a rejoint
    await page.goto(`/enseignant/classes/${id}/modifier`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Modifier la classe");
    await page.getByLabel(/Nom de la classe/).fill(`${name} bis`);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("heading", { level: 2, name: `${name} bis` })).toBeVisible();

    // Une invitation (par l'API, l'écran WT06 est livré à l'étape 5.3) apparaît « En attente du parent »
    const [relationship] = await readApi<{ code: string }[]>(page, "/api/referentials/relationships/");
    await writeApi(page, `/api/classrooms/${id}/invitations/`, {
      firstName: "Élève",
      lastName: "Invité",
      parentPhone: uniquePhone(),
      relationship: relationship.code,
    });
    const before = await readApi<School>(page, "/api/classrooms/school/");
    await page.reload();
    const invitations = page.getByRole("list", { name: "Invitations" });
    await expect(invitations.getByText("En attente du parent")).toBeVisible();
    await axe(page);

    // Annuler l'invitation : confirmation, la ligne disparaît, le focus passe à la liste, le quota est libéré
    await invitations.getByRole("button", { name: /Annuler l'invitation/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Annuler l'invitation" }).click();
    await expect(page.getByRole("list", { name: "Invitations" })).toHaveCount(0);
    const after = await readApi<School & { learnersLeft: number }>(page, "/api/classrooms/school/");
    expect(after.learnersLeft).toBe((before as School & { learnersLeft: number }).learnersLeft + 1);
  });
});

test("WT04 : la classe de Koffi (jeu D2) liste élèves et invitations de l'API ; une autre classe est introuvable", async ({ page }) => {
  await loginAs(page, "teacher");
  await page.goto("/enseignant/classes");
  await page.getByRole("list", { name: "Mes classes" }).getByRole("link", { name: /4e B · Robotique/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Élèves de la classe");
  await expect(page.getByRole("heading", { level: 2, name: "4e B · Robotique" })).toBeVisible();
  const id = Number(new URL(page.url()).pathname.split("/").pop());
  const members = await readApi<{ results: { status: string; invitationStatus: string | null }[] }>(
    page,
    `/api/classrooms/${id}/members/?pageSize=200`,
  );
  const active = members.results.filter((member: { status: string }) => member.status === "active").length;
  const invited = members.results.filter((member: { status: string }) => member.status === "invited").length;
  await expect(page.getByRole("list", { name: "Élèves de la classe" }).getByRole("listitem")).toHaveCount(active);
  await expect(page.getByRole("list", { name: "Invitations" }).getByRole("listitem")).toHaveCount(invited);
  // Jeu D2 : invitations en attente, refusée et expirée
  const invitations = page.getByRole("list", { name: "Invitations" });
  await expect(invitations.getByText("En attente du parent").first()).toBeVisible();
  await expect(invitations.getByText("Refusée").first()).toBeVisible();
  await expect(invitations.getByText("Expirée").first()).toBeVisible();
  // Aucun numéro de téléphone du parent
  await expect(page.getByText(/\+229|0190/)).toHaveCount(0);
  await axe(page);

  await page.goto("/enseignant/classes/999999");
  await expect(page.getByRole("heading", { level: 2, name: "Cette classe est introuvable" })).toBeVisible();
});
