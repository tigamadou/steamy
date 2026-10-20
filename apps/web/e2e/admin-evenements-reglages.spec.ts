import { expect, test } from "@playwright/test";

import { API_URL, STAFF, staffLogin } from "./support/staff";

// LOT-6 · 6.5 WAD12 (Steamy Events) et WAD14 (réglages) dans l'admin Django, par le Super-admin. Lecture seule sur
// le jeu D2 : le refus exceptionnel (Support) et l'édition des réglages sont couverts par pytest. Un code TOTP ne sert
// qu'une fois par compte : attente possible de plusieurs fenêtres de 30 s.

test("6.5 Super-admin suit les événements et candidatures, puis ouvre les réglages (WAD12, WAD14)", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto(`${API_URL}/admin/login/?next=/admin/events/steamyevent/`);
  await staffLogin(page, STAFF.superAdmin);
  await expect(page).toHaveURL(`${API_URL}/admin/events/steamyevent/`);

  // WAD12 événements : places restantes, accès (gratuit ou prix), date limite
  const events = page.locator("#result_list");
  await expect(events.getByRole("columnheader", { name: "Places restantes" })).toBeVisible();
  await expect(events.getByRole("columnheader", { name: "Accès" })).toBeVisible();
  await expect(events.getByRole("columnheader", { name: "Fin des candidatures" })).toBeVisible();

  // WAD12 candidatures : âge, accord du parent, paiement ; aucune action ne confirme une candidature (S3)
  await page.goto(`${API_URL}/admin/events/eventapplication/`);
  const applications = page.locator("#result_list");
  await expect(applications.getByRole("columnheader", { name: "Âge" })).toBeVisible();
  await expect(applications.getByRole("columnheader", { name: "Paiement" })).toBeVisible();
  await expect(page.locator('select[name="action"] option[value*="accept"]')).toHaveCount(0);

  // WAD14 : la liste des réglages ouvre l'unique fiche
  await page.goto(`${API_URL}/admin/core/platformsettings/`);
  await expect(page).toHaveURL(/\/admin\/core\/platformsettings\/\d+\/change\/$/);
  await expect(page.getByLabel(/Seuil de décrochage|décrochage/i)).toBeVisible();
  await expect(page.locator(".field-sms_provider")).toBeVisible();

  // Réseaux Mobile Money par pays (Celtiis compris, D76)
  await page.goto(`${API_URL}/admin/referentials/paymentnetwork/`);
  await expect(page.locator("#result_list")).toContainText("Celtiis");
  // Annonces (D7) : le Super-admin en crée ; la diffusion est une action de la liste, testée par pytest
  await page.goto(`${API_URL}/admin/core/announcement/add/`);
  await expect(page.locator('form#announcement_form, form[id$="_form"]')).toBeVisible();
});
