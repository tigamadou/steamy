import { describe, expect, it } from "vitest";

import { formatDate } from "./dates";

describe("formatDate", () => {
  it("écrit la date en toutes lettres, en français", () => {
    expect(formatDate("2026-05-28")).toBe("28 mai 2026");
    expect(formatDate("2026-01-01")).toBe("1 janvier 2026");
  });
});
