import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { apiSession, type ApiSession } from "../support/api";
import { DEMO, DEMO_PASSWORD } from "../support/demo";
import { closeFamily, createFamily, type Family } from "../support/family";
import { extractLink, waitForSms } from "../support/mailpit";
import { loginViaApi } from "../support/session";

// LOT-4 étape 4.10 · WPD05, variante enseignant (D60, C11) : l'enseignant de démo invite un élève dans sa classe
// (WT06, par l'API), son parent ouvre le lien SMS, accepte en créant le compte de l'enfant ou en rattachant un enfant
// déjà inscrit, et l'élève rejoint la classe (WT04, lu par l'API). Familles neuves à chaque passage.

type Member = { status: string; learner: { id: number; firstName: string; lastName: string } | null };

async function axe(page: Page) {
  await expect(page).toHaveTitle(/\S/);
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

/** Session API de l'enseignant de démo et sa première classe active. */
async function teacherClassroom(): Promise<{ teacher: ApiSession; classroom: { id: number; name: string } }> {
  const teacher = await apiSession();
  await teacher.post("/api/auth/login/", { identifier: DEMO.teacher.identifier, password: DEMO_PASSWORD });
  const classrooms = (await teacher.get("/api/classrooms/")) as { results: { id: number; name: string }[] };
  return { teacher, classroom: classrooms.results[0] };
}

/** WT06 : l'enseignant invite l'élève ; renvoie le lien SMS reçu par le parent. */
async function invite(teacher: ApiSession, classroomId: number, family: Family, firstName: string): Promise<URL> {
  const [relationship] = (await family.parentSession.get("/api/referentials/relationships/")) as { code: string }[];
  const since = new Date();
  await teacher.post(`/api/classrooms/${classroomId}/invitations/`, {
    firstName,
    lastName: "Test",
    parentPhone: family.parentPhone,
    relationship: relationship.code,
  });
  return extractLink(await waitForSms(family.parentPhone, { since }), "/consentement/");
}

/**
 * Le parent, déjà connecté, ouvre le lien du SMS : la demande lui est rattachée (`claim`) et WPD05 s'ouvre. La connexion
 * depuis l'atterrissage du lien (« J'ai déjà un compte ») est couverte par `parent-consentement.spec.ts`.
 */
async function openFromSms(page: Page, link: URL, family: Family) {
  await loginViaApi(page, family.parentPhone);
  await page.goto(link.pathname);
  await expect(page).toHaveURL(/\/parent\/consentements\/\d+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Demande de consentement");
}

/** Membres actifs de la classe (WT04), lus par l'API de l'enseignant. */
async function activeMembers(teacher: ApiSession, classroomId: number): Promise<Member[]> {
  const members = (await teacher.get(`/api/classrooms/${classroomId}/members/`)) as { results: Member[] };
  return members.results.filter((member) => member.status === "active");
}

test("WPD05 enseignant : le parent crée le compte de l'élève, qui rejoint la classe et se connecte", async ({ page }) => {
  const family = await createFamily();
  const { teacher, classroom } = await teacherClassroom();
  try {
    const link = await invite(teacher, classroom.id, family, "Kossi");
    await openFromSms(page, link, family);

    // Origine enseignant (D60) : enseignant, classe, établissement, parcours
    await expect(page.getByText(`Invitation de ${DEMO.teacher.firstName}`, { exact: false })).toBeVisible();
    await expect(page.getByText(classroom.name, { exact: true })).toBeVisible();
    await expect(page.getByText(/couvert par l'établissement, sans paiement/)).toBeVisible();
    await axe(page);

    // Le parent a déjà un enfant : choix « Créer le compte de Kossi » (par défaut) ou « Rattacher Yao à la classe »
    const choice = page.getByRole("group", { name: "Kossi a-t-il déjà un compte Steamy ?" });
    await expect(choice.getByRole("radio", { name: "Créer le compte de Kossi" })).toBeChecked();
    await expect(choice.getByText("Rattacher Yao à la classe")).toBeVisible();

    const form = page.getByRole("form", { name: "Accepter l'invitation" });
    const username = form.getByRole("textbox", { name: /^Identifiant/ });
    await expect(username).toHaveValue("kossi.test");
    const chosen = `kossi.${Date.now().toString(36)}`;
    await username.fill(chosen);
    await form.getByLabel(/^Mot de passe initial/).fill("Robot2026x");
    await form.getByRole("button", { name: "Accepter l'invitation" }).click();

    // Retour à WPD01 avec la classe rejointe
    await expect(page).toHaveURL(/\/parent\?consentement=\d+$/);
    await expect(page.getByText(`Invitation acceptée : Kossi a rejoint la classe « ${classroom.name} ».`)).toBeVisible();
    await expect
      .poll(async () => (await activeMembers(teacher, classroom.id)).some((member) => member.learner?.firstName === "Kossi"))
      .toBe(true);

    // Le compte créé par le parent permet à l'élève de se connecter
    const learner = await apiSession();
    try {
      await learner.post("/api/auth/login/", { identifier: chosen, password: "Robot2026x" });
    } finally {
      await learner.api.dispose();
    }
  } finally {
    await teacher.api.dispose();
    await closeFamily(family);
  }
});

test("WPD05 enseignant : le parent rattache son enfant déjà inscrit, sans nouvel identifiant (C11)", async ({ page }) => {
  const family = await createFamily();
  const { teacher, classroom } = await teacherClassroom();
  try {
    const link = await invite(teacher, classroom.id, family, "Yao");
    await openFromSms(page, link, family);
    const choice = page.getByRole("group", { name: "Yao a-t-il déjà un compte Steamy ?" });
    await choice.getByText("Rattacher Yao à la classe").click();
    await expect(choice.getByRole("radio", { name: "Rattacher Yao à la classe" })).toBeChecked();
    await expect(page.getByRole("textbox", { name: /^Identifiant/ })).toHaveCount(0);
    await expect(page.getByText(`Yao rejoint la classe « ${classroom.name} » avec son compte actuel`)).toBeVisible();
    await page.getByRole("button", { name: "Accepter l'invitation" }).click();

    await expect(page).toHaveURL(/\/parent\?consentement=\d+$/);
    await expect
      .poll(async () => (await activeMembers(teacher, classroom.id)).some((member) => member.learner?.id === family.child.id))
      .toBe(true);
  } finally {
    await teacher.api.dispose();
    await closeFamily(family);
  }
});
