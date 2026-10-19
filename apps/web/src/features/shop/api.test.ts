import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { KIT } from "@/test/api-fixtures";

type Reply = { data?: unknown; error?: unknown; status: number };
const replies = new Map<string, Reply | ((init: unknown) => Reply)>();
const answer = (method: string) =>
  vi.fn(async (path: string, init: unknown) => {
    const entry = replies.get(`${method} ${path}`) ?? { status: 500, error: { code: "SERVER_ERROR", message: "" } };
    const { data, error, status } = typeof entry === "function" ? entry(init) : entry;
    return { data, error, response: new Response(null, { status }) };
  });
const client = { GET: answer("GET"), POST: answer("POST"), PATCH: answer("PATCH"), DELETE: answer("DELETE") };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => client }));

const api = await import("./api");
const { readGuestCart, writeGuestCart } = await import("./guest-cart");

const CART = { items: [{ id: 7, kit: KIT, quantity: 2, total: 70000 }], count: 2, subtotal: 70000 };
const failure = (code: string, status: number) => ({ status, error: { code, message: `${code} !` } });

beforeEach(() => {
  replies.clear();
  Object.values(client).forEach((fn) => fn.mockClear());
});
afterEach(() => window.localStorage.clear());

describe("session vue du navigateur", () => {
  it.each([
    [{ status: 200, data: { role: "learner" } }, "learner"],
    [{ status: 200, data: { role: "parent" } }, "parent"],
    [{ status: 200, data: { role: "teacher" } }, "guest"],
    [failure("NOT_AUTHENTICATED", 401), "guest"],
  ])("%j → %s", async (reply, shopper) => {
    replies.set("GET /api/accounts/me/", reply);
    expect(await api.probeShopper()).toBe(shopper);
  });
});

describe("panier serveur", () => {
  it("lit, ajoute, modifie et retire par le client généré", async () => {
    replies.set("GET /api/shop/cart/", { status: 200, data: CART });
    replies.set("POST /api/shop/cart/items/", { status: 201, data: CART });
    replies.set("PATCH /api/shop/cart/items/{id}/", { status: 200, data: CART });
    replies.set("DELETE /api/shop/cart/items/{id}/", { status: 200, data: CART });
    expect(await api.getCart()).toEqual({ ok: true, data: CART });
    expect(await api.addCartItem("steamy-bot-v1")).toEqual({ ok: true, data: CART });
    expect(client.POST).toHaveBeenCalledWith("/api/shop/cart/items/", { body: { kitSlug: "steamy-bot-v1", quantity: 1 } });
    await api.updateCartItem(7, 3);
    expect(client.PATCH).toHaveBeenCalledWith("/api/shop/cart/items/{id}/", { params: { path: { id: 7 } }, body: { quantity: 3 } });
    expect(await api.removeCartItem(7)).toEqual({ ok: true, data: CART });
    expect(client.GET).toHaveBeenCalledTimes(1);
  });

  it("retrait sans corps (204 du schéma) : panier relu ; échec : propagé", async () => {
    replies.set("DELETE /api/shop/cart/items/{id}/", { status: 204 });
    replies.set("GET /api/shop/cart/", { status: 200, data: CART });
    expect(await api.removeCartItem(7)).toEqual({ ok: true, data: CART });
    replies.set("DELETE /api/shop/cart/items/{id}/", failure("NOT_FOUND", 404));
    expect(await api.removeCartItem(7)).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });
});

describe("ajout au panier", () => {
  it("connecté : panier serveur, sans relire la fiche", async () => {
    replies.set("POST /api/shop/cart/items/", { status: 201, data: CART });
    expect(await api.addToCart("learner", "steamy-bot-v1")).toEqual({ ok: true, data: { shopper: "learner" } });
    expect(client.GET).not.toHaveBeenCalled();
    replies.set("GET /api/accounts/me/", { status: 200, data: { role: "parent" } });
    replies.set("POST /api/shop/cart/items/", failure("OUT_OF_STOCK", 409));
    expect(await api.addToCart("public", "steamy-bot-v1")).toMatchObject({ ok: false, code: "OUT_OF_STOCK" });
  });

  it("invité : fiche relue, kit ajouté au stockage local s'il est en stock", async () => {
    replies.set("GET /api/accounts/me/", failure("NOT_AUTHENTICATED", 401));
    replies.set("GET /api/shop/kits/{slug}/", { status: 200, data: { ...KIT, available: true } });
    expect(await api.addToCart("public", "steamy-bot-v1", 2)).toEqual({ ok: true, data: { shopper: "guest" } });
    expect(readGuestCart()).toEqual([{ kitSlug: "steamy-bot-v1", quantity: 2 }]);
    replies.set("GET /api/shop/kits/{slug}/", { status: 200, data: { ...KIT, available: false } });
    expect(await api.addToCart("public", "steamy-bot-v1")).toMatchObject({ ok: false, code: "OUT_OF_STOCK" });
    replies.set("GET /api/shop/kits/{slug}/", failure("NOT_FOUND", 404));
    expect(await api.addToCart("public", "steamy-bot-v1")).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(readGuestCart()).toEqual([{ kitSlug: "steamy-bot-v1", quantity: 2 }]);
  });
});

describe("alerte de réassort", () => {
  it("invité avec numéro ; connecté sans corps", async () => {
    replies.set("POST /api/shop/kits/{slug}/restock-alerts/", { status: 201, data: { ok: true } });
    await api.requestRestockAlert("solaire", "+22901900000");
    expect(client.POST).toHaveBeenLastCalledWith("/api/shop/kits/{slug}/restock-alerts/", {
      params: { path: { slug: "solaire" } },
      body: { phone: "+22901900000" },
    });
    await api.requestRestockAlert("solaire");
    expect(client.POST).toHaveBeenLastCalledWith("/api/shop/kits/{slug}/restock-alerts/", {
      params: { path: { slug: "solaire" } },
    });
  });
});

describe("fusion du panier invité", () => {
  it("verse chaque ligne, abandonne les refus définitifs, garde les échecs passagers", async () => {
    writeGuestCart([
      { kitSlug: "bot", quantity: 2 },
      { kitSlug: "epuise", quantity: 1 },
      { kitSlug: "coupure", quantity: 1 },
    ]);
    replies.set("POST /api/shop/cart/items/", (init) => {
      const slug = (init as { body: { kitSlug: string } }).body.kitSlug;
      if (slug === "bot") return { status: 201, data: CART };
      if (slug === "epuise") return failure("OUT_OF_STOCK", 409);
      return failure("SERVER_ERROR", 500);
    });
    expect(await api.mergeGuestCart()).toBe(1);
    expect(client.POST).toHaveBeenCalledWith("/api/shop/cart/items/", { body: { kitSlug: "bot", quantity: 2 } });
    expect(readGuestCart()).toEqual([{ kitSlug: "coupure", quantity: 1 }]);
  });

  it("panier vide : aucun appel", async () => {
    expect(await api.mergeGuestCart()).toBe(0);
    expect(client.POST).not.toHaveBeenCalled();
  });
});
