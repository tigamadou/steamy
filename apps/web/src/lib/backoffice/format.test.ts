import { describe, expect, it } from "vitest";

import { formatDateTime, formatKpiValue, formatShortDate, numericSeries } from "./format";

describe("format des valeurs du back-office", () => {
  it.each([
    [null, undefined, "—"],
    ["", "text", "—"],
    [true, "yes_no", "Oui"],
    [false, "yes_no", "Non"],
    ["Robot solaire", "text", "Robot solaire"],
    [1951472, "count", "1 951 472"],
    [44000, "fcfa", "44 000 FCFA"],
    [8.5, "score", "8,5 / 10"],
    [220, undefined, "220"],
  ] as const)("%s (%s) → %s", (value, unit, expected) => {
    expect(formatKpiValue(value, unit).replace(/\s/g, " ")).toBe(expected);
  });

  it("formate une date courte", () => {
    expect(formatShortDate("2027-01-15")).toBe("15 janv. 2027");
  });
});

describe("date et heure", () => {
  it("est affichée à l'heure du Bénin", () => {
    expect(formatDateTime("2026-11-05T13:32:00Z").replace(/\s/g, " ")).toBe("5 nov. 2026, 14:32");
    expect(formatDateTime("2026-11-05T23:30:00Z").replace(/\s/g, " ")).toBe("6 nov. 2026, 00:30");
  });
});

describe("séries chiffrées", () => {
  it("omet les périodes sans valeur numérique", () => {
    expect(
      numericSeries([
        { label: "Août", value: null },
        { label: "Sept.", value: 4 },
        { label: "Oct.", value: 6 },
      ]),
    ).toEqual({ values: [4, 6], labels: ["Sept.", "Oct."] });
    expect(numericSeries([{ label: "T3", value: "texte" }])).toEqual({ values: [], labels: [] });
  });
});
