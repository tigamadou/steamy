import { describe, expect, it } from "vitest";

import { formatKpiValue, formatShortDate } from "./format";

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
