import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CHECKOUT_KEY,
  clearCheckout,
  readCheckout,
  readOrderToken,
  saveOrderToken,
  updateCheckout,
} from "./checkout-storage";

const GUEST = {
  firstName: "Awa",
  lastName: "Test",
  phone: "+2290190000002",
  phoneCountry: "BJ",
  phoneNational: "0190000002",
};

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("état du tunnel invité (sessionStorage)", () => {
  it("fusionne les étapes, sans aucun montant, puis s'efface", () => {
    updateCheckout({ guest: GUEST });
    updateCheckout({ delivery: { country: "BJ", zoneId: 1, district: "Akpakpa", addressLine: "Rue 12" } });
    updateCheckout({ reference: "KT-1" });
    expect(readCheckout()).toEqual({
      guest: GUEST,
      delivery: { country: "BJ", zoneId: 1, district: "Akpakpa", addressLine: "Rue 12" },
      reference: "KT-1",
    });
    expect(window.sessionStorage.getItem(CHECKOUT_KEY)).not.toMatch(/total|price|amount/i);
    clearCheckout();
    expect(readCheckout()).toEqual({});
  });

  it("contenu illisible ou d'un autre type : état vide", () => {
    window.sessionStorage.setItem(CHECKOUT_KEY, "{oups");
    expect(readCheckout()).toEqual({});
    window.sessionStorage.setItem(CHECKOUT_KEY, "[1]");
    expect(readCheckout()).toEqual({});
    window.sessionStorage.setItem(CHECKOUT_KEY, "null");
    expect(readCheckout()).toEqual({});
  });

  it("jeton par référence", () => {
    expect(readOrderToken("KT-1")).toBeNull();
    saveOrderToken("KT-1", "secret");
    expect(readOrderToken("KT-1")).toBe("secret");
    expect(readOrderToken("KT-2")).toBeNull();
  });

  it("stockage refusé : rien ne casse", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("plein");
    });
    expect(() => updateCheckout({ reference: "KT-1" })).not.toThrow();
    expect(() => saveOrderToken("KT-1", "x")).not.toThrow();
  });

  it("sessionStorage inaccessible (navigation privée stricte)", () => {
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new Error("refusé");
    });
    expect(readCheckout()).toEqual({});
    expect(readOrderToken("KT-1")).toBeNull();
    expect(() => clearCheckout()).not.toThrow();
  });
});
