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
  // Masqué (display: none) au-dessus de 768 px : recherché aussi parmi les éléments cachés
  const menu = page.getByRole("button", { name: "Ouvrir le menu", includeHidden: true });
  await menu.waitFor({ state: "attached" });
  // Un clic arrivé avant l'hydratation serait perdu (ou rejoué après coup) : on attend que React ait pris la main
  await page.waitForFunction(() => {
    const button = document.querySelector("button[aria-controls][aria-expanded]");
    return button !== null && Object.keys(button).some((key) => key.startsWith("__reactFiber"));
  });
  if (!(await menu.isVisible())) return;
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
}

/** Déconnexion depuis le shell applicatif : « Déconnexion » puis confirmation dans la modale WD16. */
export async function logoutFromShell(page: Page): Promise<void> {
  await openShellMenu(page);
  await page.getByRole("button", { name: "Déconnexion" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Se déconnecter" }).click();
}

/** Lecture d'un endpoint de l'API par le navigateur connecté, pour comparer l'écran aux données du serveur. */
export async function readApi<T>(page: Page, path: string): Promise<T> {
  return page.evaluate(async (path) => {
    const { apiUrl } = (await (await fetch("/runtime-config")).json()) as { apiUrl: string };
    const response = await fetch(`${apiUrl}${path}`, { credentials: "include" });
    return response.json();
  }, path) as Promise<T>;
}

/** Écriture sur l'API par le navigateur connecté (jeton CSRF relu avant l'envoi), pour préparer des données. */
export async function writeApi<T>(page: Page, path: string, body: object): Promise<T> {
  const result = await page.evaluate(
    async ({ path, body }) => {
      const { apiUrl } = (await (await fetch("/runtime-config")).json()) as { apiUrl: string };
      const csrf = (await (await fetch(`${apiUrl}/api/auth/csrf/`, { credentials: "include" })).json()) as {
        csrfToken: string;
      };
      const response = await fetch(`${apiUrl}${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf.csrfToken },
        body: JSON.stringify(body),
      });
      return { status: response.status, data: response.status === 204 ? null : await response.json() };
    },
    { path, body },
  );
  expect(result.status, `POST ${path}`).toBeLessThan(300);
  return result.data as T;
}
