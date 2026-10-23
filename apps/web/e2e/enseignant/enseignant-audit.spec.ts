import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { loginAs, readApi } from "../support/session";

// LOT-5 étape 5.9 · audit final de l'espace enseignant : axe sur chaque route, pas de défilement horizontal (le projet
// « mobile » joue ce test à 360 px), registre (vouvoiement, jamais « formateur » ni « À corriger »).

test("chaque écran de l'espace enseignant : accessibilité, largeur, registre", async ({ page }) => {
  await loginAs(page, "teacher");
  await page.goto("/enseignant");
  const classes = await readApi<{ results: { id: number; name: string }[] }>(page, "/api/classrooms/");
  const robotics = classes.results.find((classroom) => classroom.name === "4e B · Robotique")!;
  const members = await readApi<{ results: { status: string; learner: { id: number } | null }[] }>(
    page,
    `/api/classrooms/${robotics.id}/members/`,
  );
  const learner = members.results.find((member) => member.status === "active")!.learner!.id;
  const courses = await readApi<{ results: { slug: string }[] }>(page, "/api/classrooms/courses/");

  const routes = [
    "/enseignant",
    "/enseignant/parcours",
    `/enseignant/parcours/${courses.results[0].slug}`,
    "/enseignant/classes",
    "/enseignant/classes/nouvelle",
    `/enseignant/classes/${robotics.id}`,
    `/enseignant/classes/${robotics.id}/modifier`,
    `/enseignant/eleves/ajouter?classe=${robotics.id}`,
    `/enseignant/eleves/ajouter?classe=${robotics.id}&onglet=lot`,
    `/enseignant/eleves/${learner}?classe=${robotics.id}`,
    "/enseignant/evaluations",
    "/enseignant/evaluations?filtre=a-revoir",
    "/enseignant/evenements",
    "/enseignant/notifications",
    "/enseignant/parametres",
    "/enseignant/aide",
  ];

  for (const route of routes) {
    await test.step(route, async () => {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page).toHaveTitle(/\S/);

      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(violations, route).toEqual([]);

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      // En cas de débordement (contenu long compris : noms de classes créés par les autres parcours), la liste des
      // éléments qui dépassent à droite rend l'échec exploitable
      const overflowing =
        scrollWidth > clientWidth
          ? await page.evaluate(() => {
              const width = document.documentElement.clientWidth;
              return [...document.querySelectorAll("body *")]
                .filter((element) => element.getBoundingClientRect().right > width + 0.5)
                .slice(0, 5)
                .map((element) => `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 60)}`);
            })
          : [];
      expect(scrollWidth, `${route} : défilement horizontal (${overflowing.join(" | ")})`).toBeLessThanOrEqual(clientWidth);

      // Registre : vouvoiement sur les libellés de l'interface (titres, boutons, étiquettes), jamais « formateur »
      const chrome = await page
        .locator("h1, label, button, [role='tab'], legend")
        .evaluateAll((elements) => elements.map((element) => (element as HTMLElement).innerText).join(" \n "));
      expect(chrome, `${route} : tutoiement`).not.toMatch(/(?<!\p{L})(tu|ton|ta|tes|toi|te)(?!\p{L})/iu);
      const text = await page.locator("main, body").first().innerText();
      expect(text, `${route} : vocabulaire de la maquette`).not.toMatch(/formateur|à corriger/i);
    });
  }
});
