import { beforeEach, describe, expect, it, vi } from "vitest";

const reply = (status: number, data?: unknown) =>
  vi.fn(async () => ({ data, response: new Response(null, { status }) }));
const client = { GET: reply(200, { ok: 1 }), POST: reply(201, { ok: 2 }) };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => client }));

const api = await import("./api");

beforeEach(() => {
  client.GET.mockClear();
  client.POST.mockClear();
});

describe("commande invitée par le client généré", () => {
  it("zones du pays", async () => {
    expect(await api.getZones("BJ")).toEqual({ ok: true, data: { ok: 1 } });
    expect(client.GET).toHaveBeenCalledWith("/api/shop/delivery-zones/", { params: { query: { country: "BJ" } } });
  });

  it("création : type kit, lignes, invité et adresse, sans aucun prix", async () => {
    const deliveryAddress = { zoneId: 1, recipientName: "Awa Test", city: "Cotonou", district: "A", addressLine: "R" };
    const guest = { firstName: "Awa", lastName: "Test", phone: "+2290190000002" };
    await api.createKitOrder({ items: [{ kitSlug: "bot", quantity: 2 }], guest, deliveryAddress });
    expect(client.POST).toHaveBeenLastCalledWith("/api/payments/orders/", {
      body: { kind: "kit", items: [{ kitSlug: "bot", quantity: 2 }], guest, deliveryAddress },
    });
    await api.createKitOrder({ items: [], deliveryAddress });
    expect(client.POST).toHaveBeenLastCalledWith("/api/payments/orders/", {
      body: { kind: "kit", items: [], deliveryAddress },
    });
  });

  it("lecture, paiement, statut et reçu avec le jeton en en-tête ; sans jeton, aucun en-tête", async () => {
    await api.getOrder("KT-1", "secret");
    expect(client.GET).toHaveBeenLastCalledWith("/api/payments/orders/{reference}/", {
      params: { path: { reference: "KT-1" }, header: { "X-Guest-Token": "secret" } },
    });
    await api.getOrder("KT-1", null);
    expect(client.GET).toHaveBeenLastCalledWith("/api/payments/orders/{reference}/", {
      params: { path: { reference: "KT-1" }, header: undefined },
    });
    const body = { country: "BJ", network: "mtn", msisdn: "+2290190000001" };
    await api.payOrder("KT-1", "secret", body);
    expect(client.POST).toHaveBeenLastCalledWith("/api/payments/orders/{reference}/payments/", {
      params: { path: { reference: "KT-1" }, header: { "X-Guest-Token": "secret" } },
      body,
    });
    await api.getPayment(7, "secret");
    expect(client.GET).toHaveBeenLastCalledWith("/api/payments/payments/{id}/", {
      params: { path: { id: 7 }, header: { "X-Guest-Token": "secret" } },
    });
    await api.getInvoice("KT-1", "secret");
    expect(client.GET).toHaveBeenLastCalledWith("/api/payments/orders/{reference}/invoice/", {
      params: { path: { reference: "KT-1" }, header: { "X-Guest-Token": "secret" } },
      parseAs: "blob",
    });
  });
});
