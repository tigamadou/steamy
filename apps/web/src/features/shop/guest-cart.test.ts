import { afterEach, describe, expect, it, vi } from "vitest";

import {
  addGuestLine,
  GUEST_CART_KEY,
  readGuestCart,
  removeGuestLine,
  setGuestQuantity,
  writeGuestCart,
} from "./guest-cart";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("panier invité (localStorage)", () => {
  it("ajoute, cumule, change la quantité et retire, sans aucun prix stocké", () => {
    addGuestLine("bot", 1);
    addGuestLine("pack", 2);
    addGuestLine("bot", 2);
    expect(readGuestCart()).toEqual([
      { kitSlug: "bot", quantity: 3 },
      { kitSlug: "pack", quantity: 2 },
    ]);
    setGuestQuantity("pack", 5);
    removeGuestLine("bot");
    expect(JSON.parse(window.localStorage.getItem(GUEST_CART_KEY)!)).toEqual([{ kitSlug: "pack", quantity: 5 }]);
    removeGuestLine("pack");
    expect(window.localStorage.getItem(GUEST_CART_KEY)).toBeNull();
  });

  it("ignore un contenu illisible, les lignes invalides et les doublons", () => {
    window.localStorage.setItem(GUEST_CART_KEY, "{pas du json");
    expect(readGuestCart()).toEqual([]);
    window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify({ kitSlug: "bot" }));
    expect(readGuestCart()).toEqual([]);
    window.localStorage.setItem(
      GUEST_CART_KEY,
      JSON.stringify([
        { kitSlug: "bot", quantity: 1, price: 1 },
        { kitSlug: "bot", quantity: 4 },
        { kitSlug: "../x", quantity: 1 },
        { kitSlug: "pack", quantity: 0 },
        { kitSlug: "pack", quantity: 1.5 },
        null,
        "bot",
      ]),
    );
    expect(readGuestCart()).toEqual([{ kitSlug: "bot", quantity: 1, price: 1 }]);
    // Réécrit sans champ superflu
    writeGuestCart(readGuestCart());
    expect(JSON.parse(window.localStorage.getItem(GUEST_CART_KEY)!)).toEqual([{ kitSlug: "bot", quantity: 1 }]);
  });

  it("stockage indisponible : panier vide, écriture sans effet", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("refusé");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("plein");
    });
    expect(readGuestCart()).toEqual([]);
    expect(() => writeGuestCart([{ kitSlug: "bot", quantity: 1 }])).not.toThrow();
  });
});
