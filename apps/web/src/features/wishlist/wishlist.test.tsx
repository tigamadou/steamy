import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { course } from "@/test/api-fixtures";
import { axe } from "@/test/axe";

const getWishlist = vi.fn();
vi.mock("@/features/catalog/learner-state", () => ({ getWishlist }));
const addToWishlist = vi.fn();
const removeFromWishlist = vi.fn();
vi.mock("@/features/catalog/api", async (original) => ({
  ...(await original<typeof import("@/features/catalog/api")>()),
  addToWishlist,
  removeFromWishlist,
}));

const { WishlistSkeleton, WishlistView } = await import("./wishlist-view");
const { savedLabel } = await import("./WishlistGrid");

const ITEMS = [
  { course: course({ slug: "robot", title: "Robot Bluetooth", requiredKit: { slug: "bot", name: "Bot" } }), addedAt: "" },
  { course: course({ slug: "capteurs", title: "Capteurs", isFree: false, price: 18000 }), addedAt: "" },
];

async function show(tri?: string, items = ITEMS) {
  getWishlist.mockResolvedValue(items);
  return render(await WishlistView({ searchParams: Promise.resolve(tri ? { tri } : {}) }));
}

const heart = (title: string) => screen.getByRole("button", { name: `Ajouter « ${title} » à ma liste de souhaits` });

beforeEach(() => {
  addToWishlist.mockReset().mockResolvedValue({ ok: true, data: {} });
  removeFromWishlist.mockReset().mockResolvedValue({ ok: true, data: undefined });
});

describe("WW01 · souhaits", () => {
  it("compteur au pluriel, tri, cartes en favori vers WC04/WC05", async () => {
    const { container } = await show();
    expect(getWishlist).toHaveBeenCalledWith("recent");
    expect(screen.getByText("2 parcours sauvegardés")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Trier/ })).toHaveTextContent("Plus récents");
    expect(heart("Robot Bluetooth")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: "Robot Bluetooth" })).toHaveAttribute("href", "/apprenant/catalogue/robot");
    expect(screen.getByText("Avec le Kit Code")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("tri lu dans l'URL ; un tri inconnu revient à « Plus récents »", async () => {
    const user = userEvent.setup();
    await show("prix");
    expect(getWishlist).toHaveBeenLastCalledWith("price");
    await user.click(screen.getByRole("button", { name: /Trier/ }));
    expect(screen.getByRole("menuitemradio", { name: "Prix croissant" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", { name: "Plus récents" })).toHaveAttribute("href", "/apprenant/souhaits");
    expect(screen.getByRole("menuitemradio", { name: "Titre" })).toHaveAttribute("href", "/apprenant/souhaits?tri=titre");
    await show("toString");
    expect(getWishlist).toHaveBeenLastCalledWith("recent");
  });

  it("singulier", () => {
    expect(savedLabel(1)).toBe("1 parcours sauvegardé");
  });
});

describe("WW03 · retrait optimiste et annulation", () => {
  it("la carte disparaît, le toast propose « Annuler », qui la rétablit", async () => {
    const user = userEvent.setup();
    await show();
    await user.click(heart("Capteurs"));
    expect(screen.queryByRole("link", { name: "Capteurs" })).not.toBeInTheDocument();
    expect(screen.getByText("1 parcours sauvegardé")).toBeInTheDocument();
    expect(removeFromWishlist).toHaveBeenCalledWith("capteurs");
    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent("Parcours retiré des souhaits");
    await user.click(within(toast).getByRole("button", { name: "Annuler" }));
    expect(screen.getByRole("link", { name: "Capteurs" })).toBeInTheDocument();
    expect(addToWishlist).toHaveBeenCalledWith("capteurs");
  });

  it("focus : sur « Annuler » après le retrait, puis sur le cœur de la carte rétablie (WCAG 2.4.3)", async () => {
    const user = userEvent.setup();
    await show();
    await user.click(heart("Capteurs"));
    const undo = screen.getByRole("button", { name: "Annuler" });
    expect(undo).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(heart("Capteurs")).toHaveFocus();
  });

  it("retrait refusé : la carte revient avec le focus et l'erreur", async () => {
    const user = userEvent.setup();
    removeFromWishlist.mockResolvedValue({ ok: false, code: "SERVER_ERROR", message: "", fields: {} });
    await show();
    await user.click(heart("Capteurs"));
    expect(await screen.findByRole("link", { name: "Capteurs" })).toBeInTheDocument();
    expect(heart("Capteurs")).toHaveFocus();
  });

  it("double clic : les requêtes partent l'une après l'autre", async () => {
    const user = userEvent.setup();
    const order: string[] = [];
    let release!: () => void;
    removeFromWishlist.mockImplementation(
      () =>
        new Promise((resolve) => {
          order.push("DELETE");
          release = () => resolve({ ok: true, data: undefined });
        }),
    );
    addToWishlist.mockImplementation(async () => {
      order.push("PUT");
      return { ok: true, data: {} };
    });
    await show();
    await user.click(heart("Capteurs"));
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(order).toEqual(["DELETE"]);
    await act(async () => release());
    expect(order).toEqual(["DELETE", "PUT"]);
    expect(screen.getByRole("link", { name: "Capteurs" })).toBeInTheDocument();
  });

  it("dernier souhait retiré → WW02, l'annulation reste possible", async () => {
    const user = userEvent.setup();
    await show(undefined, [ITEMS[0]]);
    await user.click(heart("Robot Bluetooth"));
    expect(screen.getByRole("heading", { level: 2, name: "Aucun parcours en souhaits" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByRole("link", { name: "Robot Bluetooth" })).toBeInTheDocument();
  });
});

describe("WW02 · aucun souhait", () => {
  it("renvoie vers le catalogue", async () => {
    await show(undefined, []);
    expect(screen.getByRole("heading", { level: 2, name: "Aucun parcours en souhaits" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Découvrir le catalogue" })).toHaveAttribute("href", "/apprenant/catalogue");
  });

  it("silhouette verbalisée", () => {
    render(<WishlistSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de tes souhaits…" })).toBeInTheDocument();
  });
});
