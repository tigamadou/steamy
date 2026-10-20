import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { KIT } from "@/test/api-fixtures";

const getKit = vi.fn();
vi.mock("@/lib/shop", () => ({ getKit }));
vi.mock("@/features/shop/KitDetailView", () => ({ KitDetailView: () => null, KitDetailSkeleton: () => null }));
vi.mock("@/features/shop/CartView", () => ({ CartView: () => <p>panier</p> }));
vi.mock("@/features/shop/DeliveryZonesSlot", () => ({ DeliveryZonesSlot: () => null }));

const kitPage = await import("./[slug]/page");
const { default: KitNotFound } = await import("./[slug]/not-found");
const cartPage = await import("./panier/page");
const { KitDetailSkeleton, KitDetailView } = await import("@/features/shop/KitDetailView");
const { CartView } = await import("@/features/shop/CartView");
const { DeliveryZonesSlot } = await import("@/features/shop/DeliveryZonesSlot");

type Tree = ReactElement<{
  children: ReactElement<{ children: ReactElement<{ fallback: ReactElement; children: ReactElement<{ params?: unknown; context?: string }> }> }>;
}>;

describe("WK02 · /boutique/[slug]", () => {
  it("métadonnées du kit, ou « introuvable »", async () => {
    getKit.mockResolvedValueOnce({ ...KIT, description: "Tout le matériel" });
    expect(await kitPage.generateMetadata({ params: Promise.resolve({ slug: "steamy-bot-v1" }) } as never)).toEqual({
      title: "Steamy Bot v1",
      description: "Tout le matériel",
      alternates: { canonical: "/boutique/steamy-bot-v1" },
    });
    getKit.mockRejectedValueOnce(new Error("panne"));
    expect(await kitPage.generateMetadata({ params: Promise.resolve({ slug: "x" }) } as never)).toEqual({
      title: "Kit introuvable",
    });
  });

  it("fiche publique sous Suspense, avec sa silhouette", () => {
    const params = Promise.resolve({ slug: "steamy-bot-v1" });
    const tree = kitPage.default({ params } as never) as Tree;
    const suspense = tree.props.children.props.children;
    expect(suspense.props.fallback.type).toBe(KitDetailSkeleton);
    expect(suspense.props.children.type).toBe(KitDetailView);
    expect(suspense.props.children.props).toEqual({ params, context: "public" });
  });

  it("404 : retour à la boutique", () => {
    render(<KitNotFound />);
    expect(screen.getByRole("heading", { name: "Ce kit est introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir tous les kits" })).toHaveAttribute("href", "/boutique");
  });
});

describe("WK03 · /boutique/panier", () => {
  it("h1, panier invité non indexé, délais par zone pour le panier vide", () => {
    const tree = cartPage.default() as ReactElement<{ children: ReactElement[] }>;
    render(tree);
    expect(screen.getByRole("heading", { level: 1, name: "Votre panier" })).toBeInTheDocument();
    expect(cartPage.metadata.robots).toEqual({ index: false, follow: false });
    const view = tree.props.children[1] as ReactElement<{ context: string; zones: ReactElement<{ children: ReactElement<{ register: string }> }> }>;
    expect(view.type).toBe(CartView);
    expect(view.props.context).toBe("public");
    expect(view.props.zones.props.children.type).toBe(DeliveryZonesSlot);
    expect(view.props.zones.props.children.props.register).toBe("vous");
  });
});
