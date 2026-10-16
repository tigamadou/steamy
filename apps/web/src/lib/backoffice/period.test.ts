import { describe, expect, it } from "vitest";

import { currentQuarterKey, impactPeriod, withPeriod } from "./period";

describe("période de l'Impact Tracker", () => {
  it.each([
    [undefined, "mois", "month"],
    ["trimestre", "trimestre", "quarter"],
    [["annee", "mois"], "annee", "year"],
    ["semaine", "mois", "month"],
  ])("%s → %s (API : %s)", (value, id, api) => {
    expect(impactPeriod(value)).toMatchObject({ id, api });
  });

  it("n'ajoute la période à l'URL que hors du mois par défaut", () => {
    expect(withPeriod("/backoffice/impact", "mois")).toBe("/backoffice/impact");
    expect(withPeriod("/backoffice/impact", "annee")).toBe("/backoffice/impact?periode=annee");
  });
});

describe("trimestre en cours", () => {
  it.each([
    ["2026-01-01T00:30:00Z", "2026-t1"],
    ["2026-03-31T23:30:00Z", "2026-t2"], // déjà le 1er avril à Porto-Novo (UTC+1)
    ["2026-10-16T12:00:00Z", "2026-t4"],
  ])("%s → %s", (instant, key) => {
    expect(currentQuarterKey(new Date(instant))).toBe(key);
  });

  it("prend l'instant présent par défaut", () => {
    expect(currentQuarterKey()).toMatch(/^\d{4}-t[1-4]$/);
  });
});
