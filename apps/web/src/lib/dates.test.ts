import { describe, expect, it } from "vitest";

import { datePill, formatDate, formatFullDate, formatTimeRange } from "./dates";

describe("formatDate", () => {
  it("écrit la date en toutes lettres, en français", () => {
    expect(formatDate("2026-05-28")).toBe("28 mai 2026");
    expect(formatDate("2026-01-01")).toBe("1 janvier 2026");
  });

  it("pastille, date complète et créneau au fuseau de Porto-Novo", () => {
    expect(datePill("2026-11-05T13:00:00Z")).toEqual({ day: "5", month: "NOV" });
    expect(datePill("2026-06-28T13:00:00Z")).toEqual({ day: "28", month: "JUIN" });
    expect(formatFullDate("2026-11-05T13:00:00Z")).toBe("jeudi 5 novembre 2026");
    expect(formatTimeRange("2026-11-05T13:00:00Z", "2026-11-05T15:30:00Z")).toBe("14:00 – 16:30");
  });
});
