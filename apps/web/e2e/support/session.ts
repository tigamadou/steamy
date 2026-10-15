import { expect, type Page } from "@playwright/test";

import { DEMO, DEMO_PASSWORD, type DemoRole } from "./demo";

/**
 * Connexion par un vrai `POST auth/login/` émis depuis la page, comme le fait `getBrowserApi()` : vérifie que le
 * cookie de session posé par l'API est bien lu par le serveur Next (domaine parent commun, compose.e2e.yml).
 * Pour les parcours qui ne testent pas l'écran de connexion lui-même.
 */
export async function loginViaApi(page: Page, identifier: string, password: string = DEMO_PASSWORD): Promise<void> {
  if (page.url() === "about:blank") await page.goto("/runtime-config");
  const status = await page.evaluate(
    async ({ identifier, password }) => {
      const { apiUrl } = (await (await fetch("/runtime-config")).json()) as { apiUrl: string };
      const csrf = (await (await fetch(`${apiUrl}/api/auth/csrf/`, { credentials: "include" })).json()) as {
        csrfToken: string;
      };
      const response = await fetch(`${apiUrl}/api/auth/login/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf.csrfToken },
        body: JSON.stringify({ identifier, password }),
      });
      return response.status;
    },
    { identifier, password },
  );
  expect(status, `connexion de ${identifier}`).toBe(200);
}

/** Connecte un compte du jeu de démonstration. */
export function loginAs(page: Page, role: DemoRole): Promise<void> {
  return loginViaApi(page, DEMO[role].identifier);
}

/** Ouvre le tiroir de navigation du shell quand il est replié (écran de moins de 768 px). */
export async function openShellMenu(page: Page): Promise<void> {
  const menu = page.getByRole("button", { name: "Ouvrir le menu" });
  if (!(await menu.isVisible())) return;
  // Un clic arrivé avant l'hydratation est perdu : réessayé jusqu'à l'ouverture du tiroir
  await expect(async () => {
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true", { timeout: 1_000 });
  }).toPass();
}

/** Déconnexion depuis le shell applicatif : « Déconnexion » puis confirmation dans la modale WD16. */
export async function logoutFromShell(page: Page): Promise<void> {
  await openShellMenu(page);
  await page.getByRole("button", { name: "Déconnexion" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Se déconnecter" }).click();
}
