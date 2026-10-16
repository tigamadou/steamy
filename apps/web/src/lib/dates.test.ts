import { describe, expect, it } from "vitest";

import {
  datePill,
  formatDate,
  formatFullDate,
  formatInstant,
  formatInstantTime,
  formatRelative,
  formatTimeRange,
} from "./dates";

describe("formatInstantTime", () => {
  it("donne le jour et l'heure au fuseau de Porto-Novo", () => {
    expect(formatInstantTime("2026-10-17T08:30:00Z")).toBe("17 octobre 2026 à 09:30");
  });
});

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

describe("formatInstant", () => {
  it("donne le jour au fuseau de Porto-Novo", () => {
    expect(formatInstant("2026-10-22T08:00:00Z")).toBe("22 octobre 2026");
    // 23 h 30 UTC le 21 → déjà le 22 à Porto-Novo (UTC+1)
    expect(formatInstant("2026-10-21T23:30:00Z")).toBe("22 octobre 2026");
  });
});

describe("formatRelative", () => {
  // Midi à Porto-Novo (UTC+1)
  const now = new Date("2026-10-16T11:00:00Z");

  it.each([
    ["2026-10-16T10:59:30Z", "à l'instant"],
    ["2026-10-16T10:55:00Z", "il y a 5 min"],
    ["2026-10-16T08:00:00Z", "il y a 3 h"],
    ["2026-10-15T20:00:00Z", "hier"],
    ["2026-10-12T09:00:00Z", "il y a 4 j"],
    ["2026-10-02T09:00:00Z", "2 octobre 2026"],
  ])("%s → %s", (iso, expected) => {
    expect(formatRelative(iso, now)).toBe(expected);
  });

  it("compte depuis maintenant par défaut", () => {
    expect(formatRelative(new Date().toISOString())).toBe("à l'instant");
  });
});
