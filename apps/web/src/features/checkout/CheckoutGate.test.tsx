import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { KIT } from "@/test/api-fixtures";

const router = { replace: vi.fn(), push: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const useCart = vi.fn();
vi.mock("@/features/shop/use-cart", () => ({ useCart }));
vi.mock("./GuestInfoForm", () => ({ GuestInfoForm: () => <p>formulaire WK04</p> }));
vi.mock("./DeliveryForm", () => ({ DeliveryForm: ({ cart }: { cart: { count: number } }) => <p>{`WK05 ${cart.count}`}</p> }));

const { CheckoutGate, orderItems } = await import("./CheckoutGate");
const { CheckoutFrame } = await import("./CheckoutFrame");
const { DeliveryStep, GuestStep } = await import("./steps");

const ready = (lines = [{ kit: KIT, quantity: 2, total: 70000 }], shopper = "guest") => ({
  state: { status: "ready", shopper, lines, count: 2, subtotal: 70000, taxes: [], total: 70000, dropped: 0 },
  reload: vi.fn(),
});

beforeEach(() => {
  useCart.mockReset();
  router.replace.mockReset();
});

describe("CheckoutGate", () => {
  it("chargement, puis contenu avec le panier prêt (lignes sans prix pour la commande)", () => {
    useCart.mockReturnValue({ state: { status: "loading" }, reload: vi.fn() });
    const { rerender } = render(<CheckoutGate>{() => <p>contenu</p>}</CheckoutGate>);
    expect(screen.getByRole("status", { name: "Chargement de votre commande…" })).toBeInTheDocument();
    const cart = ready();
    useCart.mockReturnValue(cart);
    rerender(<CheckoutGate>{(c) => <p>{orderItems(c as never).map((i) => `${i.kitSlug}×${i.quantity}`).join()}</p>}</CheckoutGate>);
    expect(screen.getByText("steamy-bot-v1×2")).toBeInTheDocument();
    expect(useCart).toHaveBeenCalledWith("public", "vous");
  });

  it("panier vide, kit indisponible, erreur avec « Réessayer »", async () => {
    useCart.mockReturnValue(ready([]));
    const { rerender } = render(<CheckoutGate>{() => <p>contenu</p>}</CheckoutGate>);
    expect(screen.getByText("Votre panier est vide.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir les kits" })).toHaveAttribute("href", "/boutique");

    useCart.mockReturnValue(ready([{ kit: { ...KIT, available: false }, quantity: 1, total: 1 }]));
    rerender(<CheckoutGate>{() => <p>contenu</p>}</CheckoutGate>);
    expect(screen.getByText(/n'est plus disponible/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour au panier" })).toHaveAttribute("href", "/boutique/panier");

    const reload = vi.fn();
    useCart.mockReturnValue({ state: { status: "error", message: "Panne." }, reload });
    rerender(<CheckoutGate>{() => <p>contenu</p>}</CheckoutGate>);
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(reload).toHaveBeenCalled();
    expect(screen.queryByText("contenu")).not.toBeInTheDocument();
  });

  it("apprenant connecté : renvoyé vers son panier", async () => {
    useCart.mockReturnValue(ready(undefined, "learner"));
    render(<CheckoutGate>{() => <p>contenu</p>}</CheckoutGate>);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/apprenant/boutique/panier"));
    expect(screen.queryByText("contenu")).not.toBeInTheDocument();
  });

  it("parent connecté : pas de tunnel invité, renvoyé vers le panier de son espace", async () => {
    useCart.mockReturnValue(ready(undefined, "parent"));
    render(<CheckoutGate>{() => <p>contenu</p>}</CheckoutGate>);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/parent/boutique/panier"));
    expect(screen.queryByText("contenu")).not.toBeInTheDocument();
  });
});

describe("étapes et cadre du tunnel", () => {
  it("WK04 et WK05 derrière la garde", () => {
    useCart.mockReturnValue(ready());
    render(
      <>
        <GuestStep />
        <DeliveryStep />
      </>,
    );
    expect(screen.getByText("formulaire WK04")).toBeInTheDocument();
    expect(screen.getByText("WK05 2")).toBeInTheDocument();
  });

  it("fil d'Ariane depuis le panier, progression et titre de l'étape", () => {
    render(
      <CheckoutFrame step={3} title="Paiement Mobile Money">
        <p>étape</p>
      </CheckoutFrame>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Paiement Mobile Money" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Panier" })).toHaveAttribute("href", "/boutique/panier");
    expect(screen.getByRole("link", { name: "Vos coordonnées" })).toHaveAttribute("href", "/boutique/commande/coordonnees");
    expect(screen.getByRole("link", { name: "Livraison" })).toHaveAttribute("href", "/boutique/commande/livraison");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Étape 3 sur 3 : Paiement");
  });
});
