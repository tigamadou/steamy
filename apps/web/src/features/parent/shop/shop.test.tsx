import type { Schemas } from "@steamy/api-client";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetReferentials } from "@/lib/use-referential";
import { axe } from "@/test/axe";
import { child } from "@/test/parent-fixtures";
import { ADDRESS, COUNTRIES, NETWORKS, order, payment } from "@/test/payment-request-fixtures";

const GET = vi.fn();
const POST = vi.fn();
const PUT = vi.fn();
const serverGET = vi.fn();
const useCart = vi.fn();
const getCurrentUser = vi.fn();
const getDeliveryAddress = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ GET, POST, PUT }) }));
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET: serverGET }) }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock("@/lib/referentials", () => ({ getCountries: async () => COUNTRIES }));
vi.mock("@/features/account/api", () => ({ getDeliveryAddress: () => getDeliveryAddress() }));
vi.mock("@/features/shop/use-cart", () => ({ useCart: (...args: unknown[]) => useCart(...args) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/use-visible-polling", () => ({
  useVisiblePolling: (poll: () => void, _ms: number, enabled: boolean) => {
    useEffect(() => {
      if (enabled) poll();
    }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  },
}));

const { ParentKitCheckout } = await import("./ParentKitCheckout");
const { ParentKitCheckoutScreen, ParentKitCheckoutSkeleton } = await import("./ParentKitCheckoutScreen");

const respond = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });
const failure = (status: number, code: string) => ({ error: { code, message: "" }, response: new Response(null, { status }) });

const KIT = { slug: "steamy-bot", name: "Steamy Bot v1", available: true } as Schemas["Kit"];
const reload = vi.fn();
function cart(lines = [{ kit: KIT, quantity: 2, total: 70000, id: 1 }]) {
  return { state: { status: "ready", shopper: "parent", lines, count: 2, subtotal: 70000, taxes: [], total: 70000, dropped: 0 }, reload };
}
const PREFERRED = { country: "BJ", network: "mtn", phone: "+2290190000001" };
const BASE = {
  address: ADDRESS,
  defaultCountry: "BJ",
  parentName: "Marie Adjovi",
  kids: [child(), child({ id: 8, firstName: "Noé" })],
  countries: COUNTRIES,
  preferred: PREFERRED,
};

beforeEach(() => {
  resetReferentials();
  GET.mockReset().mockImplementation(async (path: string) => {
    if (path === "/api/referentials/countries/") return respond(200, COUNTRIES);
    if (path === "/api/referentials/payment-networks/") return respond(200, NETWORKS);
    if (path === "/api/shop/delivery-zones/") return respond(200, [ADDRESS.zone]);
    return respond(200, payment({ status: "succeeded" }));
  });
  POST.mockReset();
  PUT.mockReset();
  reload.mockReset();
  useCart.mockReturnValue(cart());
});

describe("ParentKitCheckout (achat direct de kit, C10)", () => {
  it("panier, bénéficiaire facultatif, adresse, commande du serveur puis paiement et suivi", async () => {
    const user = userEvent.setup();
    POST.mockImplementation(async (path: string) =>
      path === "/api/payments/orders/" ? respond(201, order({ total: 71500 })) : respond(201, payment()),
    );
    const { container } = render(<ParentKitCheckout {...BASE} />);
    expect(useCart).toHaveBeenCalledWith("parent", "vous");
    expect(screen.getByText("Steamy Bot v1 × 2")).toBeInTheDocument();
    expect(screen.getByText("Sous-total HT hors livraison").nextSibling).toHaveTextContent(/70\s000/);
    expect(await axe(container)).toHaveNoViolations();
    await user.selectOptions(screen.getByRole("combobox", { name: /Pour quel enfant/ }), "8");
    await waitFor(() => expect(screen.getByRole("combobox", { name: /^Ville ou zone/ })).toHaveValue("2"));
    await user.click(screen.getByRole("button", { name: "Continuer vers le paiement" }));
    expect(POST).toHaveBeenCalledWith("/api/payments/orders/", {
      body: {
        kind: "kit",
        items: [{ kitSlug: "steamy-bot", quantity: 2 }],
        deliveryAddress: {
          zoneId: 2,
          recipientName: "Marie Adjovi",
          city: "Cotonou",
          district: "Cocotomey",
          addressLine: "Rue 12.045",
        },
        beneficiaryId: 8,
      },
    });
    expect(await screen.findByText(/71\s500/, { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText(/Vos kits sont réservés jusqu'au/)).toBeInTheDocument();
    await screen.findByRole("radio", { name: "MTN Mobile Money" });
    await user.click(screen.getByRole("button", { name: /^Payer 71\s500/ }));
    expect(await screen.findByRole("link", { name: /Suivre ma commande/ })).toHaveAttribute(
      "href",
      "/parent/commandes/CMD-ABC123",
    );
  });

  it("pour la famille, sans enfant actif : aucune sélection ; rupture à la commande : panier relu", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(failure(409, "OUT_OF_STOCK"));
    render(<ParentKitCheckout {...BASE} kids={[]} />);
    expect(screen.queryByRole("combobox", { name: /Pour quel enfant/ })).toBeNull();
    await waitFor(() => expect(screen.getByRole("combobox", { name: /^Ville ou zone/ })).toHaveValue("2"));
    await user.click(screen.getByRole("button", { name: "Continuer vers le paiement" }));
    expect(await screen.findByText(/Un kit vient d'être épuisé/)).toBeInTheDocument();
    expect(reload).toHaveBeenCalled();
    expect(POST.mock.calls[0][1].body).not.toHaveProperty("beneficiaryId");
  });

  it("commande expirée au paiement : retour à l'adresse avec le motif ; déjà payée : suivi, même panier vidé", async () => {
    const user = userEvent.setup();
    POST.mockImplementation(async (path: string) =>
      path === "/api/payments/orders/" ? respond(201, order()) : failure(409, "ORDER_EXPIRED"),
    );
    render(<ParentKitCheckout {...BASE} />);
    await waitFor(() => expect(screen.getByRole("combobox", { name: /^Ville ou zone/ })).toHaveValue("2"));
    await user.click(screen.getByRole("button", { name: "Continuer vers le paiement" }));
    await screen.findByRole("radio", { name: "MTN Mobile Money" });
    await user.click(screen.getByRole("button", { name: /^Payer/ }));
    expect(await screen.findByText(/délai de réservation est dépassé/)).toBeInTheDocument();
    POST.mockImplementation(async (path: string) =>
      path === "/api/payments/orders/" ? respond(201, order()) : failure(409, "ORDER_ALREADY_PAID"),
    );
    await user.click(screen.getByRole("button", { name: "Continuer vers le paiement" }));
    await screen.findByRole("radio", { name: "MTN Mobile Money" });
    // Payée dans un autre onglet : ses kits ont quitté le panier
    useCart.mockReturnValue(cart([]));
    await user.click(screen.getByRole("button", { name: /^Payer/ }));
    expect(await screen.findByText("Cette commande est déjà payée.")).toBeInTheDocument();
    expect(screen.queryByText("Votre panier est vide.")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Suivre ma commande" })).toHaveAttribute(
      "href",
      "/parent/commandes/CMD-ABC123",
    );
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("commande de kit déjà en attente : reprise proposée avant d'en créer une seconde", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ParentKitCheckout {...BASE} pendingOrder={{ reference: "CMD-OLD", expiresAt: "2026-10-20T12:30:00Z" }} />,
    );
    expect(screen.getByText("Une commande de kit attend déjà votre paiement.")).toBeInTheDocument();
    expect(screen.getByText(/Commande CMD-OLD, réservée jusqu'au/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reprendre le paiement" })).toHaveAttribute("href", "/parent/commandes/CMD-OLD");
    expect(screen.queryByRole("button", { name: "Continuer vers le paiement" })).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole("button", { name: "Passer une nouvelle commande" }));
    expect(screen.getByRole("button", { name: "Continuer vers le paiement" })).toBeInTheDocument();
    expect(POST).not.toHaveBeenCalled();
  });

  it("chargement, erreur, panier vide, kit indisponible", async () => {
    const user = userEvent.setup();
    useCart.mockReturnValue({ state: { status: "loading" }, reload });
    const view = render(<ParentKitCheckout {...BASE} />);
    expect(screen.getByRole("status", { name: "Chargement de votre commande…" })).toBeInTheDocument();
    view.unmount();

    useCart.mockReturnValue({ state: { status: "error", message: "Panne." }, reload });
    const error = render(<ParentKitCheckout {...BASE} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Panne.");
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(reload).toHaveBeenCalled();
    error.unmount();

    useCart.mockReturnValue(cart([]));
    const empty = render(<ParentKitCheckout {...BASE} />);
    expect(screen.getByRole("link", { name: "Voir la boutique" })).toHaveAttribute("href", "/parent/boutique");
    empty.unmount();

    useCart.mockReturnValue(cart([{ kit: { ...KIT, available: false }, quantity: 1, total: 35000, id: 1 }]));
    render(<ParentKitCheckout {...BASE} />);
    expect(screen.getByRole("link", { name: "Retour au panier" })).toHaveAttribute("href", "/parent/boutique/panier");
  });
});

describe("ParentKitCheckoutScreen", () => {
  it("adresse, Mobile Money, enfants actifs et nom du parent", async () => {
    getCurrentUser.mockResolvedValue({ firstName: "Marie", lastName: "Adjovi" });
    getDeliveryAddress.mockResolvedValue(ADDRESS);
    serverGET.mockImplementation(async (path: string) =>
      path === "/api/accounts/children/"
        ? respond(200, { results: [child(), child({ id: 9, status: "deactivated" })] })
        : respond(200, { locality: { country: "BJ" }, mobileMoney: PREFERRED }),
    );
    const tree = (await ParentKitCheckoutScreen()) as ReactElement<Parameters<typeof ParentKitCheckout>[0]>;
    expect(tree.props).toMatchObject({ defaultCountry: "BJ", parentName: "Marie Adjovi", preferred: PREFERRED });
    expect(tree.props.kids.map((kid) => kid.id)).toEqual([7]);

    serverGET.mockImplementation(async (path: string) =>
      path === "/api/accounts/children/" ? respond(200, {}) : respond(200, { locality: null, mobileMoney: null }),
    );
    const bare = (await ParentKitCheckoutScreen()) as ReactElement<Parameters<typeof ParentKitCheckout>[0]>;
    expect(bare.props).toMatchObject({ defaultCountry: "", kids: [], pendingOrder: null });

    // Commande de kit en attente et non expirée : proposée à la reprise (parcours ou commande expirée ignorés)
    const later = new Date(Date.now() + 600_000).toISOString();
    const earlier = new Date(Date.now() - 600_000).toISOString();
    serverGET.mockImplementation(async (path: string) =>
      path === "/api/payments/orders/"
        ? respond(200, {
            results: [
              order({ reference: "CMD-COURSE", kind: "course", expiresAt: later }),
              order({ reference: "CMD-EXPIRED", expiresAt: earlier }),
              order({ reference: "CMD-KIT", expiresAt: later }),
            ],
          })
        : path === "/api/accounts/children/"
          ? respond(200, { results: [] })
          : respond(200, { locality: null, mobileMoney: null }),
    );
    const resumed = (await ParentKitCheckoutScreen()) as ReactElement<Parameters<typeof ParentKitCheckout>[0]>;
    expect(resumed.props.pendingOrder).toEqual({ reference: "CMD-KIT", expiresAt: later });
    expect(serverGET).toHaveBeenCalledWith("/api/payments/orders/", { params: { query: { status: "pending" } } });

    serverGET.mockResolvedValue(respond(401));
    expect(await ParentKitCheckoutScreen()).toBeNull();
    render(<ParentKitCheckoutSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de votre commande…" })).toBeInTheDocument();
  });
});
