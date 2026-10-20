import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const router = { push: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const addToCart = vi.fn();
vi.mock("./api", () => ({ addToCart }));

const { AddToCartButton, cartHref } = await import("./AddToCartButton");

beforeEach(() => {
  addToCart.mockReset();
  router.push.mockReset();
});

describe("AddToCartButton", () => {
  it("carte : ajoute et confirme par un toast (vouvoiement en public)", async () => {
    addToCart.mockResolvedValue({ ok: true, data: { shopper: "guest" } });
    render(<AddToCartButton slug="bot" name="Steamy Bot" context="public" />);
    await userEvent.click(screen.getByRole("button", { name: "Ajouter Steamy Bot au panier" }));
    expect(addToCart).toHaveBeenCalledWith("public", "bot");
    expect(await screen.findByText("« Steamy Bot » est dans votre panier.")).toBeInTheDocument();
  });

  it("apprenant : tutoiement ; épuisé entre-temps ; autre erreur de l'API", async () => {
    addToCart.mockResolvedValueOnce({ ok: true, data: { shopper: "learner" } });
    render(<AddToCartButton slug="bot" name="Steamy Bot" context="learner" />);
    const button = screen.getByRole("button", { name: /Ajouter/ });
    await userEvent.click(button);
    expect(await screen.findByText("« Steamy Bot » est dans ton panier.")).toBeInTheDocument();
    addToCart.mockResolvedValueOnce({ ok: false, code: "OUT_OF_STOCK", message: "", fields: {} });
    await userEvent.click(button);
    expect(await screen.findByText("Ce kit vient d'être épuisé.")).toBeInTheDocument();
    addToCart.mockResolvedValueOnce({ ok: false, code: "NETWORK_UNAVAILABLE", message: "", fields: {} });
    await userEvent.click(button);
    expect(await screen.findByText(/Vérifie ta connexion internet/)).toBeInTheDocument();
  });

  it("fiche : « Acheter maintenant » ajoute puis ouvre le panier de qui regarde", async () => {
    addToCart.mockResolvedValue({ ok: true, data: { shopper: "learner" } });
    render(<AddToCartButton slug="bot" name="Steamy Bot" context="public" variant="detail" />);
    expect(screen.getByRole("button", { name: "Ajouter au panier" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Acheter maintenant" }));
    expect(router.push).toHaveBeenCalledWith("/apprenant/boutique/panier");
  });

  it("fiche : erreur au vouvoiement", async () => {
    addToCart.mockResolvedValue({ ok: false, code: "SERVER_ERROR", message: "", fields: {} });
    render(<AddToCartButton slug="bot" name="Steamy Bot" context="public" variant="detail" />);
    await userEvent.click(screen.getByRole("button", { name: "Ajouter au panier" }));
    expect(await screen.findByText(/Réessayez dans quelques instants/)).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("panier de l'invité et du parent : celui de la boutique publique", () => {
    expect(cartHref("guest")).toBe("/boutique/panier");
    expect(cartHref("parent")).toBe("/boutique/panier");
  });
});
