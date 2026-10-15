import { describe, expect, it } from "vitest";

import { formatDate, formatInstant } from "./dates";

describe("formatDate", () => {
  it("écrit la date en toutes lettres, en français", () => {
    expect(formatDate("2026-05-28")).toBe("28 mai 2026");
    expect(formatDate("2026-01-01")).toBe("1 janvier 2026");
  });
});

describe("formatInstant", () => {
  it("donne le jour au fuseau de Porto-Novo", () => {
    expect(formatInstant("2026-10-22T08:00:00Z")).toBe("22 octobre 2026");
    // 23 h 30 UTC le 21 → déjà le 22 à Porto-Novo (UTC+1)
    expect(formatInstant("2026-10-21T23:30:00Z")).toBe("22 octobre 2026");
  });
});
