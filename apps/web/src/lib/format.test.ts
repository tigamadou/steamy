import { describe, expect, it } from "vitest";

import { course } from "@/test/api-fixtures";

import { DIFFICULTY_LABELS, formatPrice, toCourseCard } from "./format";

describe("format", () => {
  it("écrit les prix en francs CFA avec des espaces de milliers", () => {
    expect(formatPrice(25000).replace(/\s/g, " ")).toBe("25 000 F CFA");
    expect(formatPrice(0)).toBe("0 F CFA");
  });

  it("nomme la difficulté, jamais le niveau (S2)", () => {
    expect(DIFFICULTY_LABELS).toEqual({ beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" });
  });

  it("prépare la carte d'un parcours vers sa fiche publique", () => {
    expect(toCourseCard(course())).toMatchObject({
      href: "/parcours/decouverte-robotique",
      difficulty: "Débutant",
      isFree: true,
      color: "#5B3FE0",
      emoji: "🤖",
    });
    const paid = toCourseCard(course({ isFree: undefined, price: undefined, emoji: "" }));
    expect(paid.isFree).toBe(false);
    expect(paid.priceLabel).toBe("0 F CFA");
    expect(paid.emoji).toBe("🤖");
  });
});
