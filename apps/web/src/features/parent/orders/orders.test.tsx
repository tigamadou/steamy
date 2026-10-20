import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";
import { COUNTRIES, order } from "@/test/payment-request-fixtures";

const GET = vi.fn();
const router = { refresh: vi.fn() };
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("@/lib/referentials", () => ({ getCountries: async () => COUNTRIES }));
vi.stubEnv("PUBLIC_API_URL", "http://api.test/");
vi.mock("next/navigation", () => ({ useRouter: () => router, notFound: () => notFound() }));
vi.mock("./PendingOrderPayment", () => ({ PendingOrderPayment: () => <p>Formulaire de paiement</p> }));

const { ORDER_FILTERS, parseOrderFilter, KIND_ICONS } = await import("./status");
const { OrderRow, orderTitle } = await import("./OrderRow");
const { InvoiceLink } = await import("./InvoiceLink");
const { KitCodeList } = await import("./KitCodeList");
const { ParentOrders, ParentOrdersSkeleton, parsePage, ORDERS_PAGE_SIZE } = await import("./ParentOrders");
const { OrderDetail, OrderDetailSkeleton } = await import("./OrderDetail");

const respond = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });

const PAID_KIT = order({
  status: "paid",
  paidAt: "2026-10-19T10:00:00Z",
  kitCodes: [
    { code: "STEAMY-K4G3-MVJF", kitSlug: "steamy-bot", redeemed: false },
    { code: "STEAMY-AAAA-BBBB", kitSlug: "inconnu", redeemed: true },
  ],
  invoice: { number: "FAC-1", pdfStatus: "ready" },
});
const COURSE = order({
  reference: "CMD-COURSE",
  kind: "course",
  status: "paid",
  items: [{ ...order().items[0], title: "Capteurs électroniques", kitSlug: "", courseSlug: "capteurs" }],
  beneficiary: { id: 7, firstName: "Léa" },
});
const PENDING_EVENT = order({ reference: "CMD-EVT", kind: "event", status: "pending", beneficiary: null });

beforeEach(() => {
  GET.mockReset();
  router.refresh.mockReset();
});

describe("statuts et filtres de WPD07", () => {
  it("4 statuts de commande dans l'URL, valeur inconnue → « Toutes »", () => {
    expect(Object.keys(ORDER_FILTERS)).toEqual(["payees", "en-attente", "annulees", "remboursees"]);
    expect(parseOrderFilter("remboursees")).toBe("remboursees");
    expect(parseOrderFilter(["payees"])).toBe("payees");
    expect(parseOrderFilter("autre")).toBeNull();
    expect(parseOrderFilter(undefined)).toBeNull();
    expect(parsePage("3")).toBe(3);
    expect(parsePage(["0"])).toBe(1);
  });

  it("pictogramme selon `kind`, jamais selon le libellé (D37)", () => {
    expect(Object.values(KIND_ICONS).map((kind) => kind.icon)).toEqual(["📚", "📦", "🎟️"]);
  });
});

describe("OrderRow (3 kind, 4 statuts)", () => {
  it("kit payé : bénéficiaire absent, livraison, « Facture » et « Suivre »", async () => {
    const { container } = render(<OrderRow order={PAID_KIT} />);
    const row = screen.getByRole("article", { name: "Kit : Steamy Bot v1" });
    expect(row).toHaveTextContent("📦");
    expect(row).toHaveTextContent(/N° CMD-ABC123 · .* · Livraison : En préparation/);
    expect(within(row).getByText("Payée")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: /^Facture\s*de la commande CMD-ABC123$/ })).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: /^Suivre\s*la commande CMD-ABC123$/ })).toHaveAttribute(
      "href",
      "/parent/commandes/CMD-ABC123",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("parcours payé pour un enfant : bénéficiaire, facture, pas de suivi", () => {
    render(<OrderRow order={COURSE} />);
    const row = screen.getByRole("article", { name: "Parcours : Capteurs électroniques" });
    expect(row).toHaveTextContent("Pour Léa");
    expect(within(row).queryByRole("link", { name: /Suivre/ })).toBeNull();
  });

  it("événement en attente : « Payer » vers le détail, sans facture", () => {
    render(<OrderRow order={PENDING_EVENT} />);
    const row = screen.getByRole("article", { name: /^Événement/ });
    expect(within(row).getByText("En attente de paiement")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: /^Payer\s*la commande CMD-EVT$/ })).toHaveAttribute(
      "href",
      "/parent/commandes/CMD-EVT",
    );
    expect(within(row).queryByRole("link", { name: /Facture/ })).toBeNull();
  });

  it.each([
    ["cancelled", "Annulée"],
    ["refunded", "Remboursée"],
  ] as const)("kit %s : statut, suivi sans facture", (status, label) => {
    render(<OrderRow order={order({ status, items: [{ ...order().items[0], quantity: 2 }] })} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText("Steamy Bot v1 × 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Suivre/ })).toBeInTheDocument();
    expect(orderTitle(order({ items: [] }))).toBe("");
  });
});

describe("InvoiceLink", () => {
  it("PDF prêt : lien direct vers l'API ; sinon « en préparation »", () => {
    render(<InvoiceLink reference="CMD-1" invoice={{ number: "FAC-1", pdfStatus: "ready" }} />);
    expect(screen.getByRole("link", { name: /^Facture\s*de la commande CMD-1$/ })).toHaveAttribute(
      "href",
      "http://api.test/api/payments/orders/CMD-1/invoice/",
    );
    render(<InvoiceLink reference="CMD-2" invoice={{ number: "FAC-2", pdfStatus: "pending" }} />);
    render(<InvoiceLink reference="CMD-3" invoice={null} />);
    expect(screen.getAllByText("Facture en préparation")).toHaveLength(2);
  });
});

describe("KitCodeList (C10, D35)", () => {
  it("codes du payeur : copie, « Utilisé », kit nommé", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("refusé"));
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { container } = render(<KitCodeList codes={PAID_KIT.kitCodes} kitNames={{ "steamy-bot": "Steamy Bot v1" }} />);
    const list = screen.getByRole("list", { name: "Kit Codes de la commande" });
    expect(within(list).getByText("STEAMY-K4G3-MVJF")).toBeInTheDocument();
    expect(within(list).getByText("Steamy Bot v1")).toBeInTheDocument();
    expect(within(list).getByText("inconnu")).toBeInTheDocument();
    expect(within(list).getByText("Utilisé")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole("button", { name: /^Copier\s*le code STEAMY-K4G3-MVJF$/ }));
    expect(writeText).toHaveBeenCalledWith("STEAMY-K4G3-MVJF");
    expect(screen.getByRole("button", { name: /^Copié/ })).toBeInTheDocument();
    expect(screen.getByText("Code STEAMY-K4G3-MVJF copié.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Copié/ }));
    expect(screen.getByRole("button", { name: /^Copier/ })).toBeInTheDocument();
  });
});

describe("ParentOrders (WPD07)", () => {
  it("commandes du payeur filtrées par statut, paginées", async () => {
    GET.mockResolvedValue(respond(200, { count: 30, next: "x", results: [PAID_KIT, COURSE] }));
    const { container } = render(
      (await ParentOrders({ searchParams: Promise.resolve({ statut: "payees", page: "2" }) })) as ReactElement,
    );
    expect(GET).toHaveBeenCalledWith("/api/payments/orders/", {
      params: { query: { page: 2, pageSize: ORDERS_PAGE_SIZE, status: "paid" } },
    });
    expect(screen.getByRole("link", { name: "Payées" })).toHaveAttribute("aria-current", "page");
    expect(within(screen.getByRole("list", { name: "Mes commandes" })).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "‹ Plus récentes" })).toHaveAttribute("href", "/parent/commandes?statut=payees");
    expect(screen.getByRole("link", { name: "Plus anciennes ›" })).toHaveAttribute(
      "href",
      "/parent/commandes?statut=payees&page=3",
    );
    expect(screen.getByRole("link", { name: "Acheter un kit" })).toHaveAttribute("href", "/parent/boutique");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("aucune commande : état vide actionnable ; filtre vide : message", async () => {
    GET.mockResolvedValue(respond(200, { results: [] }));
    const view = render((await ParentOrders({ searchParams: Promise.resolve({}) })) as ReactElement);
    expect(screen.getByRole("heading", { level: 2, name: "Aucune commande pour l'instant" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pages des commandes" })).toBeNull();
    view.unmount();
    GET.mockResolvedValue(respond(200, { results: [], next: null }));
    render((await ParentOrders({ searchParams: Promise.resolve({ statut: "annulees" }) })) as ReactElement);
    expect(screen.getByText("Aucune commande « Annulées » pour l'instant.")).toBeInTheDocument();
  });

  it("session perdue : rien ; squelette", async () => {
    GET.mockResolvedValue(respond(401));
    expect(await ParentOrders({ searchParams: Promise.resolve({}) })).toBeNull();
    render(<ParentOrdersSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de vos commandes…" })).toBeInTheDocument();
  });
});

describe("OrderDetail (suivi, C10)", () => {
  const params = (reference: string) => Promise.resolve({ reference });

  function routeApi(answer: ReturnType<typeof respond>) {
    GET.mockImplementation(async (path: string) =>
      path === "/api/accounts/me/parent-profile/" ? respond(200, { mobileMoney: null }) : answer,
    );
  }

  it("kit payé : articles, livraison, adresse, frise, Kit Codes et facture", async () => {
    routeApi(respond(200, PAID_KIT));
    const { container } = render((await OrderDetail({ params: params("CMD-ABC123") })) as ReactElement);
    expect(screen.getByRole("heading", { level: 2, name: "Steamy Bot v1" })).toBeInTheDocument();
    expect(screen.getByText("Livraison (Cotonou)")).toBeInTheDocument();
    expect(screen.getByText(/Marie Adjovi · Cocotomey, Rue 12.045, Cotonou/)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Suivi de livraison" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Kit Codes de la commande" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Télécharger la facture/ })).toBeInTheDocument();
    expect(screen.queryByText("Formulaire de paiement")).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("commande en attente : délai et reprise du paiement", async () => {
    routeApi(respond(200, PENDING_EVENT));
    render((await OrderDetail({ params: params("CMD-EVT") })) as ReactElement);
    expect(screen.getByText(/À payer avant le/)).toBeInTheDocument();
    expect(screen.getByText("Formulaire de paiement")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Suivi de livraison" })).toBeNull();
  });

  it.each([
    ["remboursée par le Support après paiement", "refunded", "2026-10-01T10:00:00Z", "Commande remboursée : elle vous a été remboursée."],
    ["remboursée, paiement arrivé après le délai (C17)", "refunded", null, "Commande remboursée : elle vous a été remboursée."],
    ["annulée", "cancelled", null, "Commande annulée : elle n'a pas été payée à temps et le stock a été libéré."],
  ] as const)("commande %s : message sans motif supposé, sans facture", async (_case, status, paidAt, text) => {
    routeApi(
      respond(200, order({ status, paidAt, deliveryAddress: null, deliveryZone: null as never, kind: "course" })),
    );
    render((await OrderDetail({ params: params("CMD-ABC123") })) as ReactElement);
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByText(/après le délai/)).toBeNull();
    expect(screen.queryByRole("link", { name: /facture/i })).toBeNull();
  });

  it("commande d'un autre payeur → introuvable ; session perdue → rien ; squelette", async () => {
    routeApi(respond(404));
    await expect(OrderDetail({ params: params("CMD-X") })).rejects.toThrow("NEXT_NOT_FOUND");
    routeApi(respond(401));
    expect(await OrderDetail({ params: params("CMD-X") })).toBeNull();
    render(<OrderDetailSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de la commande…" })).toBeInTheDocument();
  });

  it("kit en attente : profil illisible, aucun Mobile Money prérempli", async () => {
    GET.mockImplementation(async (path: string) =>
      path === "/api/accounts/me/parent-profile/" ? respond(500) : respond(200, order({ kitCodes: [] })),
    );
    render((await OrderDetail({ params: params("CMD-ABC123") })) as ReactElement);
    expect(screen.getByText("Formulaire de paiement")).toBeInTheDocument();
  });
});

