import { describe, expect, it } from "vitest";

import { impactPeriod, withPeriod } from "./period";

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
