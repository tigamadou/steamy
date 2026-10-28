import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ADDRESS, CHILD, COUNTRIES, KIT_REQUEST, order, paymentRequest } from "@/test/payment-request-fixtures";

const GET = vi.fn();
const getCurrentUser = vi.fn();
const getDeliveryAddress = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock("@/lib/referentials", () => ({ getCountries: async () => COUNTRIES }));
vi.mock("@/features/account/api", () => ({ getDeliveryAddress: () => getDeliveryAddress() }));
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));
vi.mock("./PaymentRequestFlow", () => ({ PaymentRequestFlow: () => null }));
vi.mock("./ClosedRequest", () => ({ ClosedRequest: () => <p>Demande close</p> }));

const { PaymentRequestScreen, PaymentRequestSkeleton, parseRequestId } = await import("./PaymentRequestScreen");
const { PaymentRequestFlow } = await import("./PaymentRequestFlow");

const respond = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });
const params = (id: string) => Promise.resolve({ id });
const PROFILE = { locality: { country: "BJ" }, mobileMoney: { country: "BJ", network: "mtn", phone: "+2290190000001" } };

type Flow = ReactElement<Parameters<typeof PaymentRequestFlow>[0]>;

function routeApi(request: unknown, { child = respond(200, CHILD), profile = respond(200, PROFILE) } = {}) {
  GET.mockImplementation(async (path: string) => {
    switch (path) {
      case "/api/payments/payment-requests/{id}/":
        return request;
      case "/api/accounts/children/{id}/":
        return child;
      case "/api/catalog/courses/{slug}/":
        return respond(200, { requiredKit: { slug: "kit", name: "Kit Capteurs" } });
      case "/api/accounts/me/parent-profile/":
        return profile;
      default:
        return respond(200, order());
    }
  });
}

describe("PaymentRequestScreen (WPD15, serveur)", () => {
  beforeEach(() => {
    GET.mockReset();
    notFound.mockClear();
    getCurrentUser.mockResolvedValue({ firstName: "Marie", lastName: "Adjovi" });
    getDeliveryAddress.mockResolvedValue(ADDRESS);
  });

  it("identifiant illisible ou demande d'une autre famille : « Demande introuvable »", async () => {
    expect(parseRequestId("12")).toBe(12);
    expect(parseRequestId("abc")).toBeNull();
    await expect(PaymentRequestScreen({ params: params("abc") })).rejects.toThrow("NEXT_NOT_FOUND");
    routeApi(respond(404));
    await expect(PaymentRequestScreen({ params: params("99") })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(GET).toHaveBeenCalledWith("/api/payments/payment-requests/{id}/", { params: { path: { id: 99 } } });
  });

  it("demande de parcours en attente : enfant, kit requis, Mobile Money préféré, sans commande", async () => {
    routeApi(respond(200, paymentRequest()));
    const tree = (await PaymentRequestScreen({ params: params("12") })) as Flow;
    expect(tree.type).toBe(PaymentRequestFlow);
    expect(tree.props).toMatchObject({
      child: CHILD,
      requiredKit: { slug: "kit", name: "Kit Capteurs" },
      order: null,
      address: null,
      defaultCountry: "BJ",
      parentName: "Marie Adjovi",
      countries: COUNTRIES,
      preferred: PROFILE.mobileMoney,
    });
    expect(GET).toHaveBeenCalledWith("/api/accounts/children/{id}/", { params: { path: { id: "7" } } });
    expect(getDeliveryAddress).not.toHaveBeenCalled();
  });

  it("demande de kit avec commande en attente : commande reprise et adresse par défaut", async () => {
    routeApi(respond(200, { ...KIT_REQUEST, pendingOrderReference: "CMD-ABC123" }), {
      profile: respond(200, { locality: null, mobileMoney: null }),
    });
    const tree = (await PaymentRequestScreen({ params: params("12") })) as Flow;
    expect(GET).toHaveBeenCalledWith("/api/payments/orders/{reference}/", {
      params: { path: { reference: "CMD-ABC123" } },
    });
    expect(tree.props).toMatchObject({ order: order(), address: ADDRESS, requiredKit: null, defaultCountry: "" });
  });

  it("commande en attente illisible : nouvelle commande au paiement", async () => {
    GET.mockImplementation(async (path: string) =>
      path === "/api/payments/orders/{reference}/"
        ? respond(404)
        : path === "/api/payments/payment-requests/{id}/"
          ? respond(200, { ...paymentRequest(), pendingOrderReference: "CMD-X" })
          : path === "/api/accounts/me/parent-profile/"
            ? respond(200, PROFILE)
            : respond(200, CHILD),
    );
    const tree = (await PaymentRequestScreen({ params: params("12") })) as Flow;
    expect(tree.props.order).toBeNull();
  });

  it("demande close : récapitulatif et état en lecture seule", async () => {
    routeApi(respond(200, paymentRequest({ status: "declined", course: null, items: KIT_REQUEST.items, kind: "kit" })));
    render((await PaymentRequestScreen({ params: params("12") })) as ReactElement);
    expect(screen.getByText("Demande close")).toBeInTheDocument();
    expect(screen.getByText("Refusée")).toBeInTheDocument();
    expect(GET).not.toHaveBeenCalledWith("/api/accounts/me/parent-profile/");
  });

  it("demande de kit payée : relue avec sa commande (frais de livraison, taxes et total figés par le serveur)", async () => {
    routeApi(respond(200, { ...KIT_REQUEST, status: "paid", orderReference: "CMD-ABC123" }));
    render((await PaymentRequestScreen({ params: params("12") })) as ReactElement);
    expect(GET).toHaveBeenCalledWith("/api/payments/orders/{reference}/", {
      params: { path: { reference: "CMD-ABC123" } },
    });
    expect(screen.getByText("Total payé")).toBeInTheDocument();
    expect(screen.getByText(/^Livraison/)).toBeInTheDocument();
    expect(screen.queryByText(/hors livraison/)).not.toBeInTheDocument();
  });

  it("demande de parcours payée : récapitulatif de la demande, commande non relue", async () => {
    routeApi(respond(200, paymentRequest({ status: "paid", orderReference: "CMD-ABC123" })));
    render((await PaymentRequestScreen({ params: params("12") })) as ReactElement);
    expect(GET).not.toHaveBeenCalledWith("/api/payments/orders/{reference}/", expect.anything());
  });

  it("demande de kit payée dont la commande est illisible : récapitulatif de la demande", async () => {
    GET.mockImplementation(async (path: string) =>
      path === "/api/payments/orders/{reference}/"
        ? respond(404)
        : path === "/api/payments/payment-requests/{id}/"
          ? respond(200, { ...KIT_REQUEST, status: "paid", orderReference: "CMD-X" })
          : respond(200, CHILD),
    );
    render((await PaymentRequestScreen({ params: params("12") })) as ReactElement);
    expect(screen.getByText("Montant demandé hors livraison")).toBeInTheDocument();
  });

  it("session perdue : ne rend rien", async () => {
    routeApi(respond(401));
    expect(await PaymentRequestScreen({ params: params("12") })).toBeNull();
    routeApi(respond(200, paymentRequest()), { child: respond(401) });
    expect(await PaymentRequestScreen({ params: params("12") })).toBeNull();
    routeApi(respond(200, paymentRequest()), { profile: respond(401) });
    expect(await PaymentRequestScreen({ params: params("12") })).toBeNull();
    getCurrentUser.mockResolvedValue(null);
    routeApi(respond(200, paymentRequest()));
    expect(await PaymentRequestScreen({ params: params("12") })).toBeNull();
  });

  it("squelette annoncé", () => {
    render(<PaymentRequestSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de la demande…" })).toBeInTheDocument();
  });
});
