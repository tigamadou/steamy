import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { apiSession } from "./support/api";
import { DEMO, DEMO_PASSWORD } from "./support/demo";
import { closeFamily, createFamily } from "./support/family";
import { loginAs, loginViaApi } from "./support/session";

// LOT-4 étape 4.8 · WPD11 Rapport hebdomadaire (D55) : chiffres identiques à ceux de l'API pour Léa (jeu D2),
// navigation vers la semaine précédente (`?semaine=`), encart d'envoi par email ou « Ajouter un email ».

type Report = {
  week: string;
  startDate: string;
  previousWeek: string | null;
  seconds: number;
  missionsCompleted: number;
  quizzesPassed: number;
  email: string | null;
};

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

/** Valeur d'une pastille de statistique (`dt` → `dd`). */
function stat(page: Page, label: string) {
  return page.locator("dt", { hasText: label }).locator("xpath=following-sibling::dd[1]");
}

/** « 25 min », « 1 h 05 » : même format que l'écran, à partir des secondes de l'API. */
function duration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)} h ${String(rest).padStart(2, "0")}` : `${minutes / 60} h`;
}

test("WPD11 : rapport de Léa (jeu D2), chiffres de l'API, semaine précédente puis « Cette semaine »", async ({ page }) => {
  const marie = await apiSession();
  try {
    await marie.post("/api/auth/login/", { identifier: DEMO.parent.identifier, password: DEMO_PASSWORD });
    const children = (await marie.get("/api/accounts/children/?pageSize=50")) as {
      results: { id: number; firstName: string }[];
    };
    const lea = children.results.find((child) => child.firstName === "Léa") as { id: number };
    const current = (await marie.get(`/api/accounts/children/${lea.id}/weekly-report/`)) as Report;

    await loginAs(page, "parent");
    await page.goto(`/parent/enfants/${lea.id}`);
    await page.getByRole("link", { name: "Rapport hebdomadaire" }).click();
    await expect(page).toHaveURL(`/parent/enfants/${lea.id}/rapport`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rapport hebdomadaire");
    await expect(stat(page, "Temps d'apprentissage")).toHaveText(duration(current.seconds));
    await expect(stat(page, "Missions terminées")).toHaveText(String(current.missionsCompleted));
    await expect(stat(page, "Quiz réussis")).toHaveText(String(current.quizzesPassed));
    if (current.email) {
      await expect(page.getByText(/Ce rapport vous est envoyé chaque semaine à/)).toContainText(current.email);
    }
    await expect(page.getByRole("link", { name: /^Voir le profil/ })).toHaveAttribute("href", `/parent/enfants/${lea.id}`);
    await expect(page.getByRole("button", { name: /Envoyer/ })).toHaveCount(0);
    await axe(page);

    // Semaine précédente : `?semaine=` et chiffres de l'API pour cette semaine
    const previous = (await marie.get(
      `/api/accounts/children/${lea.id}/weekly-report/?week=${current.previousWeek}`,
    )) as Report;
    const weeks = page.getByRole("navigation", { name: "Semaines" });
    await weeks.getByRole("link", { name: "Semaine précédente" }).click();
    await expect(page).toHaveURL(`/parent/enfants/${lea.id}/rapport?semaine=${current.previousWeek}`);
    await expect(weeks.getByRole("link", { name: "Semaine suivante" })).toBeVisible();
    await expect(weeks.getByRole("link", { name: "Semaine suivante" })).toHaveAttribute(
      "href",
      `/parent/enfants/${lea.id}/rapport?semaine=${current.week}`,
    );
    await expect(stat(page, "Temps d'apprentissage")).toHaveText(duration(previous.seconds));
    await expect(stat(page, "Missions terminées")).toHaveText(String(previous.missionsCompleted));

    // « Cette semaine » : retour à la semaine en cours, sans `?semaine=`
    await weeks.getByRole("link", { name: "Cette semaine" }).click();
    await expect(page).toHaveURL(`/parent/enfants/${lea.id}/rapport`);
    await expect(stat(page, "Temps d'apprentissage")).toHaveText(duration(current.seconds));

    // Semaine refusée par l'API : retour à l'URL sans `?semaine=`
    await page.goto(`/parent/enfants/${lea.id}/rapport?semaine=1999-W10`);
    await expect(page).toHaveURL(`/parent/enfants/${lea.id}/rapport`);
  } finally {
    await marie.api.dispose();
  }
});

test("WPD11 : enfant sans activité et parent sans email → semaine vide et « Ajouter un email »", async ({ page }) => {
  const family = await createFamily();
  try {
    await loginViaApi(page, family.parentPhone);
    await page.goto(`/parent/enfants/${family.child.id}/rapport`);
    await expect(page.getByText(/Aucune activité cette semaine : Yao n'a pas encore travaillé sur Steamy\./)).toBeVisible();
    await expect(stat(page, "Temps d'apprentissage")).toHaveText("0 min");
    const addEmail = page.getByRole("link", { name: "Ajouter un email" });
    await expect(addEmail).toBeVisible();
    await expect(addEmail).toHaveAttribute("href", "/parent/parametres");
    await axe(page);
  } finally {
    await closeFamily(family);
  }
});
