import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { KIT } from "@/test/api-fixtures";

const getKit = vi.fn();
vi.mock("@/lib/shop", () => ({ getKit }));
vi.mock("@/components/public/shop-sections", () => ({ ShopCatalog: () => null, ShopCatalogSkeleton: () => null }));
vi.mock("@/features/shop/KitDetailView", () => ({ KitDetailView: () => null, KitDetailSkeleton: () => null }));
vi.mock("@/features/shop/CartView", () => ({ CartView: () => null }));
vi.mock("@/features/unlock/LearnerCart", () => ({ LearnerCart: () => null }));
vi.mock("@/features/shop/DeliveryZonesSlot", () => ({ DeliveryZonesSlot: () => null }));

const shopPage = await import("./page");
const kitPage = await import("./[slug]/page");
const { default: KitNotFound } = await import("./[slug]/not-found");
const cartPage = await import("./panier/page");
const { ShopCatalog, ShopCatalogSkeleton } = await import("@/components/public/shop-sections");
const { KitDetailSkeleton, KitDetailView } = await import("@/features/shop/KitDetailView");
const { LearnerCart } = await import("@/features/unlock/LearnerCart");
const { DeliveryZonesSlot } = await import("@/features/shop/DeliveryZonesSlot");

type Suspended = ReactElement<{
  children: ReactElement<{ fallback: ReactElement; children: ReactElement<Record<string, unknown>> }>;
}>;

describe("boutique de l'apprenant", () => {
  it("WK01 : lien vers le panier, catalogue des kits sous Suspense", () => {
    const searchParams = Promise.resolve({});
    const tree = shopPage.default({ searchParams } as never) as ReactElement<{ children: [ReactElement, Suspended] }>;
    render(tree);
    expect(shopPage.metadata).toEqual({ title: "Boutique de kits" });
    expect(screen.getByRole("link", { name: "Mon panier" })).toHaveAttribute("href", "/apprenant/boutique/panier");
    const suspense = tree.props.children[1].props.children;
    expect(suspense.props.fallback.type).toBe(ShopCatalogSkeleton);
    expect(suspense.props.children.type).toBe(ShopCatalog);
    expect(suspense.props.children.props).toEqual({ searchParams, context: "learner" });
  });

  it("WK02 : métadonnées et fiche dans le shell", async () => {
    getKit.mockResolvedValueOnce(KIT);
    expect(await kitPage.generateMetadata({ params: Promise.resolve({ slug: "steamy-bot-v1" }) } as never)).toEqual({
      title: "Steamy Bot v1",
    });
    getKit.mockRejectedValueOnce(new Error("panne"));
    expect(await kitPage.generateMetadata({ params: Promise.resolve({ slug: "x" }) } as never)).toEqual({
      title: "Kit introuvable",
    });
    const params = Promise.resolve({ slug: "steamy-bot-v1" });
    const suspense = (kitPage.default({ params } as never) as Suspended).props.children;
    expect(suspense.props.fallback.type).toBe(KitDetailSkeleton);
    expect(suspense.props.children.type).toBe(KitDetailView);
    expect(suspense.props.children.props).toEqual({ params, context: "learner" });
  });

  it("WK02 : 404 en h2 sous le header", () => {
    render(<KitNotFound />);
    expect(screen.getByRole("heading", { level: 2, name: "Ce kit est introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à la boutique" })).toHaveAttribute("href", "/apprenant/boutique");
  });

  it("WK03 : panier serveur avec la demande au parent (WK08), délais par zone au tutoiement", () => {
    const view = cartPage.default() as ReactElement<{
      zones: ReactElement<{ children: ReactElement<{ register: string }> }>;
    }>;
    expect(cartPage.metadata).toEqual({ title: "Mon panier" });
    expect(view.type).toBe(LearnerCart);
    expect(view.props.zones.props.children.type).toBe(DeliveryZonesSlot);
    expect(view.props.zones.props.children.props.register).toBe("tu");
  });
});
