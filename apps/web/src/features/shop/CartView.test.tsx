import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { KIT } from "@/test/api-fixtures";
import { axe } from "@/test/axe";

const router = { replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const api = {
  probeShopper: vi.fn(),
  getCart: vi.fn(),
  getKitDetail: vi.fn(),
  mergeGuestCart: vi.fn(),
  updateCartItem: vi.fn(),
  removeCartItem: vi.fn(),
};
vi.mock("./api", () => api);

const { CartView } = await import("./CartView");
const { readGuestCart, writeGuestCart } = await import("./guest-cart");

const PACK = { ...KIT, slug: "pack", name: "Pack Électronique", price: 22000, emoji: "" };
const cart = (items: Array<{ id: number; kit: typeof KIT; quantity: number }>) => ({
  items: items.map((item) => ({ ...item, total: item.kit.price * item.quantity })),
  count: items.reduce((n, item) => n + item.quantity, 0),
  subtotal: items.reduce((n, item) => n + item.kit.price * item.quantity, 0),
});
const failure = (code: string) => ({ ok: false, code, message: "", fields: {} });

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  router.replace.mockReset();
  api.mergeGuestCart.mockResolvedValue(0);
});
afterEach(() => window.localStorage.clear());

describe("WK03 · panier de l'apprenant (serveur)", () => {
  it("lignes, sous-total de l'API, livraison à l'étape suivante, sans CTA avant 3.7c", async () => {
    api.getCart.mockResolvedValue({ ok: true, data: cart([{ id: 1, kit: KIT, quantity: 2 }, { id: 2, kit: PACK, quantity: 1 }]) });
    render(<CartView context="learner" />);
    expect(screen.getByRole("status", { name: "Chargement du panier…" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Steamy Bot v1" })).toHaveAttribute(
      "href",
      "/apprenant/boutique/steamy-bot-v1",
    );
    const recap = screen.getByRole("region", { name: "Récapitulatif" });
    expect(within(recap).getByText("Sous-total (3 articles)")).toBeInTheDocument();
    expect(within(recap).getAllByText(/92\s000 F CFA/)).toHaveLength(2);
    expect(within(recap).getByText("Calculée à l'étape suivante")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Demander à mon parent/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Commander" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continuer mes achats" })).toHaveAttribute("href", "/apprenant/boutique");
    expect(api.probeShopper).not.toHaveBeenCalled();
    expect(api.mergeGuestCart).not.toHaveBeenCalled();
  });

  it("« Demander à mon parent » remet les lignes au rappel (WK08) ; un échec est affiché sous le bouton", async () => {
    api.getCart.mockResolvedValue({ ok: true, data: cart([{ id: 1, kit: KIT, quantity: 2 }]) });
    const onRequestParent = vi.fn().mockResolvedValueOnce("Un kit n'est plus en stock.").mockResolvedValueOnce(null);
    render(<CartView context="learner" onRequestParent={onRequestParent} />);
    await userEvent.click(await screen.findByRole("button", { name: "Demander à mon parent" }));
    expect(onRequestParent).toHaveBeenCalledWith([{ kitSlug: "steamy-bot-v1", quantity: 2 }]);
    expect(await screen.findByRole("alert")).toHaveTextContent("Un kit n'est plus en stock.");
    await userEvent.click(screen.getByRole("button", { name: "Demander à mon parent" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Demander à mon parent/ })).toBeDisabled();
  });

  it("quantité et retrait enregistrés sur le serveur ; échec annoncé ; focus rendu à la liste", async () => {
    api.getCart.mockResolvedValue({ ok: true, data: cart([{ id: 1, kit: KIT, quantity: 2 }, { id: 2, kit: PACK, quantity: 1 }]) });
    api.updateCartItem.mockResolvedValueOnce({ ok: true, data: cart([{ id: 1, kit: KIT, quantity: 3 }, { id: 2, kit: PACK, quantity: 1 }]) });
    render(<CartView context="learner" />);
    await userEvent.click(await screen.findByRole("button", { name: "Ajouter un exemplaire de Steamy Bot v1" }));
    expect(api.updateCartItem).toHaveBeenCalledWith(1, 3);
    expect(await screen.findByText("Sous-total (4 articles)")).toBeInTheDocument();

    api.updateCartItem.mockResolvedValueOnce(failure("VALIDATION_ERROR"));
    await userEvent.click(screen.getByRole("button", { name: "Ajouter un exemplaire de Steamy Bot v1" }));
    expect(await screen.findByText("Une erreur est survenue. Réessaie.")).toBeInTheDocument();

    api.removeCartItem.mockResolvedValueOnce({ ok: true, data: cart([{ id: 2, kit: PACK, quantity: 1 }]) });
    await userEvent.click(screen.getByRole("button", { name: "Retirer Steamy Bot v1" }));
    expect(api.removeCartItem).toHaveBeenCalledWith(1);
    expect(await screen.findByText("« Steamy Bot v1 » retiré du panier.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Articles du panier" })).toHaveFocus();
    expect(screen.queryByRole("link", { name: "Steamy Bot v1" })).not.toBeInTheDocument();
  });

  it("kit épuisé depuis l'ajout : CTA bloqué jusqu'au retrait", async () => {
    api.getCart.mockResolvedValue({ ok: true, data: cart([{ id: 1, kit: { ...KIT, available: false }, quantity: 1 }]) });
    render(<CartView context="learner" onRequestParent={vi.fn()} />);
    expect(await screen.findByText("Retire les kits indisponibles pour continuer.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Demander à mon parent" })).toBeDisabled();
  });

  it("WK10 · panier vide : « Voir les kits » et délais par zone", async () => {
    api.getCart.mockResolvedValue({ ok: true, data: cart([]) });
    render(<CartView context="learner" zones={<p>Cotonou : 24 à 48 h</p>} />);
    expect(await screen.findByRole("heading", { name: "Ton panier est vide" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir les kits" })).toHaveAttribute("href", "/apprenant/boutique");
    expect(screen.getByText("Cotonou : 24 à 48 h")).toBeInTheDocument();
  });

  it("panier illisible : message et « Réessayer »", async () => {
    api.getCart.mockResolvedValueOnce(failure("NETWORK_UNAVAILABLE"));
    api.getCart.mockResolvedValueOnce({ ok: true, data: cart([]) });
    render(<CartView context="learner" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Vérifie ta connexion internet");
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByRole("heading", { name: "Ton panier est vide" })).toBeInTheDocument();
  });
});

describe("WK03 · panier de l'invité (localStorage)", () => {
  it("prix relus dans l'API, quantités locales, « Commander » vers WK04", async () => {
    writeGuestCart([
      { kitSlug: "steamy-bot-v1", quantity: 1 },
      { kitSlug: "pack", quantity: 2 },
    ]);
    api.probeShopper.mockResolvedValue("guest");
    api.getKitDetail.mockImplementation(async (slug: string) => ({ ok: true, data: slug === "pack" ? PACK : KIT }));
    render(<CartView context="public" />);
    expect(await screen.findByText("Sous-total (3 articles)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Commander" })).toHaveAttribute("href", "/boutique/commande/coordonnees");
    expect(screen.getByRole("link", { name: "Steamy Bot v1" })).toHaveAttribute("href", "/boutique/steamy-bot-v1");

    await userEvent.click(screen.getByRole("button", { name: "Retirer un exemplaire de Pack Électronique" }));
    expect(readGuestCart()).toEqual([
      { kitSlug: "steamy-bot-v1", quantity: 1 },
      { kitSlug: "pack", quantity: 1 },
    ]);
    expect(screen.getByText("Sous-total (2 articles)")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retirer Pack Électronique" }));
    expect(readGuestCart()).toEqual([{ kitSlug: "steamy-bot-v1", quantity: 1 }]);
    expect(api.updateCartItem).not.toHaveBeenCalled();
  });

  it("kit retiré de la vente : ligne supprimée et signalée ; kit épuisé : « Commander » désactivé", async () => {
    writeGuestCart([
      { kitSlug: "disparu", quantity: 1 },
      { kitSlug: "steamy-bot-v1", quantity: 1 },
    ]);
    api.probeShopper.mockResolvedValue("guest");
    api.getKitDetail.mockImplementation(async (slug: string) =>
      slug === "disparu" ? failure("NOT_FOUND") : { ok: true, data: { ...KIT, available: false } },
    );
    render(<CartView context="public" />);
    expect(await screen.findByText(/n'est plus en vente : il a été retiré/)).toBeInTheDocument();
    expect(readGuestCart()).toEqual([{ kitSlug: "steamy-bot-v1", quantity: 1 }]);
    expect(screen.getByText("Retirez les kits indisponibles pour continuer.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Commander" })).toBeDisabled();
  });

  it("seul kit retiré de la vente : panier vide avec l'avis", async () => {
    writeGuestCart([{ kitSlug: "disparu", quantity: 1 }]);
    api.probeShopper.mockResolvedValue("guest");
    api.getKitDetail.mockResolvedValue(failure("NOT_FOUND"));
    render(<CartView context="public" />);
    expect(await screen.findByRole("heading", { name: "Votre panier est vide" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Un kit de votre panier n'est plus en vente");
    expect(screen.getByRole("link", { name: "Voir les kits" })).toHaveAttribute("href", "/boutique");
  });

  it("fiche illisible : erreur au vouvoiement", async () => {
    writeGuestCart([{ kitSlug: "steamy-bot-v1", quantity: 1 }]);
    api.probeShopper.mockResolvedValue("guest");
    api.getKitDetail.mockResolvedValue(failure("SERVER_ERROR"));
    render(<CartView context="public" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Réessayez dans quelques instants");
  });

  it("erreur inattendue au chargement : message générique", async () => {
    api.probeShopper.mockRejectedValue(new Error("boom"));
    render(<CartView context="public" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Une erreur est survenue de notre côté");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    writeGuestCart([{ kitSlug: "steamy-bot-v1", quantity: 1 }]);
    api.probeShopper.mockResolvedValue("guest");
    api.getKitDetail.mockResolvedValue({ ok: true, data: KIT });
    const { container } = render(<CartView context="public" />);
    await screen.findByText("Sous-total (1 article)");
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("panier public vu par un compte connecté", () => {
  it("apprenant : panier invité versé puis renvoi vers son panier", async () => {
    writeGuestCart([{ kitSlug: "steamy-bot-v1", quantity: 1 }]);
    api.probeShopper.mockResolvedValue("learner");
    api.getCart.mockResolvedValue({ ok: true, data: cart([{ id: 1, kit: KIT, quantity: 1 }]) });
    render(<CartView context="public" />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/apprenant/boutique/panier"));
    expect(api.mergeGuestCart).toHaveBeenCalled();
    expect(screen.getByRole("status", { name: "Chargement du panier…" })).toBeInTheDocument();
  });

  it("parent : panier serveur et « Commander »", async () => {
    api.probeShopper.mockResolvedValue("parent");
    api.getCart.mockResolvedValue({ ok: true, data: cart([{ id: 1, kit: KIT, quantity: 1 }]) });
    render(<CartView context="public" />);
    expect(await screen.findByRole("link", { name: "Commander" })).toBeInTheDocument();
    expect(api.mergeGuestCart).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("démonté avant la réponse : rien n'est mis à jour", async () => {
    let resolve!: (value: unknown) => void;
    api.getCart.mockReturnValue(new Promise((r) => (resolve = r)));
    const { unmount } = render(<CartView context="learner" />);
    unmount();
    resolve({ ok: true, data: cart([]) });
    await Promise.resolve();
  });

  it("démonté avant un échec : rien n'est mis à jour", async () => {
    let reject!: (error: unknown) => void;
    api.getCart.mockReturnValue(new Promise((_, r) => (reject = r)));
    const { unmount } = render(<CartView context="learner" />);
    unmount();
    reject(new Error("boom"));
    await Promise.resolve();
  });
});
