import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";
import { ok, order, paymentRequest } from "@/test/unlock-fixtures";

const GET = vi.fn();
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));

const { MyOrders, MyOrdersSkeleton } = await import("./MyOrders");
const { default: OrdersPage } = await import("@/app/(apprenant)/apprenant/(shell)/profil/commandes/page");

/** Réponses de l'API par chemin : commandes et demandes en attente. */
function api({ orders = [] as unknown[], next = null as string | null, requests = [] as unknown[] } = {}) {
  GET.mockImplementation(async (path: string) =>
    path === "/api/payments/orders/" ? ok({ count: orders.length, next, results: orders }) : ok({ results: requests }),
  );
}

beforeEach(() => GET.mockReset());

async function renderOrders(filter: Parameters<typeof MyOrders>[0]["filter"], page = 1) {
  return render((await MyOrders({ filter, page })) as ReactElement);
}

describe("MyOrders · WD14", () => {
  it("demandes en attente en tête, puis commandes (type, n°, date, statut, montant, livraison d'un kit)", async () => {
    api({
      requests: [paymentRequest()],
      orders: [
        order(),
        order({
          reference: "STM-KIT1",
          kind: "kit",
          shippingStatus: "shipped",
          total: 36000,
          items: [{ ...order().items[0], title: "Steamy Bot v1" }],
        }),
        order({ reference: "STM-KIT2", kind: "kit", status: "pending", total: 23000 }),
        order({ reference: "STM-EVT", kind: "event", status: "refunded" }),
      ],
    });
    const { container } = await renderOrders(null);
    expect(GET).toHaveBeenCalledWith("/api/payments/orders/", { params: { query: { page: 1, pageSize: 10 } } });
    expect(screen.getByRole("link", { name: "Profil" })).toHaveAttribute("href", "/apprenant/profil");
    expect(screen.getByRole("link", { name: "Toutes" })).toHaveAttribute("aria-current", "page");
    const rows = within(screen.getByRole("list", { name: "Tes commandes" })).getAllByRole("listitem");
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveTextContent("En attente de ton parent");
    expect(within(rows[0]).getByRole("link", { name: "Voir la demande : Capteurs électroniques" })).toHaveAttribute(
      "href",
      "/apprenant/demandes/12",
    );
    expect(rows[1]).toHaveTextContent(/Parcours.*N° STM-7K2Q9 · 13 octobre 2026.*Payée.*18\s000 F CFA/);
    expect(rows[2]).toHaveTextContent(/Kit.*Steamy Bot v1.*Livraison : Expédiée.*36\s000 F CFA/);
    expect(rows[3]).toHaveTextContent("En attente de paiement");
    expect(rows[3]).not.toHaveTextContent("Livraison");
    expect(rows[4]).toHaveTextContent(/Événement.*Remboursée/);
    // Pas de facture pour l'apprenant (C12)
    expect(screen.queryByText(/Facture/)).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("filtre « Payées » : statut transmis à l'API, sans les demandes ; pagination", async () => {
    api({ orders: [order()], next: "page-3" });
    await renderOrders("payees", 2);
    expect(GET).toHaveBeenCalledTimes(1);
    expect(GET).toHaveBeenCalledWith("/api/payments/orders/", {
      params: { query: { page: 2, pageSize: 10, status: "paid" } },
    });
    expect(screen.getByRole("link", { name: "Payées" })).toHaveAttribute("aria-current", "page");
    const pages = screen.getByRole("navigation", { name: "Pages des commandes" });
    expect(within(pages).getByRole("link", { name: "‹ Plus récentes" })).toHaveAttribute(
      "href",
      "/apprenant/profil/commandes?statut=payees",
    );
    expect(within(pages).getByRole("link", { name: "Plus anciennes ›" })).toHaveAttribute(
      "href",
      "/apprenant/profil/commandes?statut=payees&page=3",
    );
  });

  it("filtre « En attente » : demandes comprises ; page 1 suivie d'autres pages", async () => {
    api({ requests: [paymentRequest()], orders: [], next: "page-2" });
    await renderOrders("en-attente");
    expect(screen.getByText("En attente de ton parent")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Plus anciennes ›" })).toHaveAttribute(
      "href",
      "/apprenant/profil/commandes?statut=en-attente&page=2",
    );
    expect(screen.queryByRole("link", { name: "‹ Plus récentes" })).not.toBeInTheDocument();
  });

  it("vide : invitation à explorer le catalogue ; filtre vide : message", async () => {
    api();
    const { unmount } = await renderOrders(null);
    expect(screen.getByRole("heading", { level: 2, name: "Aucune commande pour l'instant" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explorer le catalogue" })).toHaveAttribute("href", "/apprenant/catalogue");
    unmount();
    await renderOrders("annulees");
    expect(screen.getByText("Aucune commande « Annulées » pour l'instant.")).toBeInTheDocument();
  });

  it("commandes illisibles : erreur (enveloppe d'erreur du shell)", async () => {
    GET.mockResolvedValue({ data: undefined, response: new Response(null, { status: 500 }) });
    await expect(MyOrders({ filter: "payees", page: 1 })).rejects.toThrow("Commandes illisibles");
  });

  it("squelette verbalisé", () => {
    render(<MyOrdersSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de tes commandes…" })).toBeInTheDocument();
  });
});

describe("page WD14", () => {
  type Page = ReactElement<{ children: ReactElement<{ filter: unknown; page: number }> }>;

  it.each([
    [{}, null, 1],
    [{ statut: "payees", page: "2" }, "payees", 2],
    [{ statut: "toString", page: "0" }, null, 1],
    [{ statut: ["payees"], page: "abc" }, null, 1],
  ])("paramètres %j → filtre %s, page %s", async (searchParams, filter, page) => {
    const element = (await OrdersPage({ searchParams: Promise.resolve(searchParams) } as never)) as Page;
    expect(element.props.children.props).toEqual({ filter, page });
  });
});
