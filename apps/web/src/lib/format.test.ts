import { describe, expect, it } from "vitest";

import { course } from "@/test/api-fixtures";

import {
  DIFFICULTY_LABELS,
  formatMinutes,
  formatPrice,
  formatPriceHt,
  quantityLabel,
  TAX_LABELS,
  toCourseCard,
} from "./format";

describe("format", () => {
  it("écrit les prix en francs CFA avec des espaces de milliers", () => {
    expect(formatPrice(25000).replace(/\s/g, " ")).toBe("25 000 F CFA");
    expect(formatPrice(0)).toBe("0 F CFA");
  });

  it("les prix du catalogue sont hors taxes (C25) ; les taxes de l'API ont leur libellé", () => {
    expect(formatPriceHt(25000).replace(/\s/g, " ")).toBe("25 000 F CFA HT");
    expect(TAX_LABELS).toEqual({ vat: "TVA", aib: "AIB" });
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
    expect(paid.priceLabel).toBe("0 F CFA HT");
    expect(paid.emoji).toBe("🤖");
  });

  it("vers la fiche de l'espace apprenant, sans prix de parcours pour un parcours à kit (D36)", () => {
    const kit = toCourseCard(
      course({ isFree: false, price: 25000, requiredKit: { slug: "bot", name: "Bot" } }),
      "/apprenant/catalogue/decouverte-robotique",
    );
    expect(kit).toMatchObject({ href: "/apprenant/catalogue/decouverte-robotique", isFree: false });
    expect(kit.priceLabel).toBe("Avec le Kit Code");
    // Un parcours à kit marqué gratuit par erreur n'est pas annoncé « Gratuit »
    expect(toCourseCard(course({ requiredKit: { slug: "bot", name: "Bot" } })).isFree).toBe(false);
  });

  it("écrit les durées de mission", () => {
    expect(formatMinutes(8)).toBe("8 min");
    expect(formatMinutes(60)).toBe("1 h");
    expect(formatMinutes(75)).toBe("1 h 15");
    expect(formatMinutes(125)).toBe("2 h 05");
  });

  it("écrit une ligne de commande avec sa quantité au-delà d'une unité", () => {
    expect(quantityLabel("Steamy Bot v1", 2)).toBe("Steamy Bot v1 × 2");
    expect(quantityLabel("Steamy Bot v1", 1)).toBe("Steamy Bot v1");
  });
});
