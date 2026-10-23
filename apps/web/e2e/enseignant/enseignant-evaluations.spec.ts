import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { loginAs, readApi } from "../support/session";

// LOT-5 étape 5.5 · évaluations (WT07) : filtres et classe dans l'URL, « À revoir », pas de correction.

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations).toEqual([]);
}

type Reviews = { count: number; results: { id: number; learner: { id: number }; classroom: { id: number } }[] };

test("WT07 : les filtres dans l'URL donnent les évaluations de l'API, sans action de correction", async ({ page }) => {
  await loginAs(page, "teacher");
  await page.goto("/enseignant/evaluations");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Évaluations");
  const all = await readApi<Reviews>(page, "/api/classrooms/reviews/?pageSize=20");
  await expect(page.getByRole("status").filter({ hasText: /évaluation/ })).toHaveText(
    `${all.count} évaluation${all.count > 1 ? "s" : ""}`,
  );
  const tabs = page.getByRole("navigation", { name: "Filtrer les évaluations" });
  await expect(tabs.getByRole("link", { name: "Toutes" })).toHaveAttribute("aria-current", "page");

  // À revoir : tentatives échouées non commentées, filtre dans l'URL (rechargement compris)
  await tabs.getByRole("link", { name: "À revoir" }).click();
  await expect(page).toHaveURL("/enseignant/evaluations?filtre=a-revoir");
  const toReview = await readApi<Reviews>(page, "/api/classrooms/reviews/?status=to_review&pageSize=20");
  await expect(page.getByRole("status").filter({ hasText: /évaluation|Aucune/ }).first()).toContainText(String(toReview.count));
  if (toReview.count > 0) {
    const first = toReview.results[0];
    await expect(page.getByRole("list", { name: "Évaluations : À revoir" }).getByRole("link", { name: /^Commenter/ }).first()).toHaveAttribute(
      "href",
      `/enseignant/eleves/${first.learner.id}?classe=${first.classroom.id}&tentative=${first.id}`,
    );
  } else {
    await expect(page.getByText("Rien à revoir : toutes les tentatives échouées ont été commentées.")).toBeVisible();
  }
  await page.reload();
  await expect(tabs.getByRole("link", { name: "À revoir" })).toHaveAttribute("aria-current", "page");

  // Formatives et sommatives
  await tabs.getByRole("link", { name: "Formatives" }).click();
  await expect(page).toHaveURL("/enseignant/evaluations?filtre=formatives");
  const formative = await readApi<Reviews>(page, "/api/classrooms/reviews/?type=formative&pageSize=20");
  await expect(page.getByRole("status").filter({ hasText: /évaluation/ })).toContainText(String(formative.count));
  await tabs.getByRole("link", { name: "Sommatives" }).click();
  await expect(page).toHaveURL("/enseignant/evaluations?filtre=sommatives");

  // Aucune correction ni modification de note
  await expect(page.getByRole("button", { name: /corriger|modifier la note|noter/i })).toHaveCount(0);
  await expect(page.getByText(/à corriger/i)).toHaveCount(0);
  await axe(page);
});

test("WT07 : filtre par classe dans l'URL, filtre d'URL invalide ramené à « Toutes »", async ({ page }) => {
  await loginAs(page, "teacher");
  await page.goto("/enseignant/evaluations");
  const { results } = await readApi<{ results: { id: number; name: string }[] }>(page, "/api/classrooms/");
  const robotics = results.find((classroom) => classroom.name === "4e B · Robotique")!;
  await page.getByRole("combobox", { name: "Classe" }).selectOption(String(robotics.id));
  await expect(page).toHaveURL(`/enseignant/evaluations?classe=${robotics.id}`);
  const filtered = await readApi<Reviews>(page, `/api/classrooms/reviews/?classroomId=${robotics.id}&pageSize=20`);
  await expect(page.getByRole("status").filter({ hasText: /évaluation/ })).toContainText(String(filtered.count));
  // Le filtre de classe est conservé en changeant d'onglet
  await page.getByRole("navigation", { name: "Filtrer les évaluations" }).getByRole("link", { name: "À revoir" }).click();
  await expect(page).toHaveURL(`/enseignant/evaluations?filtre=a-revoir&classe=${robotics.id}`);

  // Une classe qui n'est pas la mienne : même liste que « Toutes les classes »
  await page.goto("/enseignant/evaluations?classe=999999");
  const all = await readApi<Reviews>(page, "/api/classrooms/reviews/?pageSize=20");
  await expect(page.getByRole("combobox", { name: "Classe" })).toHaveValue("");
  await expect(page.getByRole("status").filter({ hasText: /évaluation/ })).toContainText(String(all.count));

  // Page au-delà de la dernière : retour à la première page
  await page.goto("/enseignant/evaluations?page=99");
  await expect(page).toHaveURL("/enseignant/evaluations");
  await expect(page.getByRole("navigation", { name: "Pagination des évaluations" })).toHaveCount(0);

  await page.goto("/enseignant/evaluations?filtre=a-corriger&page=-3");
  await expect(
    page.getByRole("navigation", { name: "Filtrer les évaluations" }).getByRole("link", { name: "Toutes" }),
  ).toHaveAttribute("aria-current", "page");
});
