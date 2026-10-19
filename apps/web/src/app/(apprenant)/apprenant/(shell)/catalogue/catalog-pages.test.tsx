import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { courseDetail } from "@/test/api-fixtures";

const getCourse = vi.fn();
vi.mock("@/lib/catalog", () => ({ getCourse }));
vi.mock("@/features/catalog/catalog-view", () => ({
  LearnerCatalog: () => null,
  LearnerCatalogSkeleton: () => null,
}));
vi.mock("@/features/catalog/course-view", () => ({ LearnerCourseView: () => null }));
vi.mock("@/features/wishlist/wishlist-view", () => ({ WishlistView: () => null, WishlistSkeleton: () => null }));

const catalogPage = await import("./page");
const coursePage = await import("./[slug]/page");
const { default: CourseNotFound } = await import("./[slug]/not-found");
const wishlistPage = await import("../souhaits/page");
const { LearnerCatalog, LearnerCatalogSkeleton } = await import("@/features/catalog/catalog-view");
const { LearnerCourseView } = await import("@/features/catalog/course-view");
const { CourseDetailSkeleton } = await import("@/features/catalog/course-detail");
const { WishlistSkeleton, WishlistView } = await import("@/features/wishlist/wishlist-view");

type Tree = ReactElement<{ children: ReactElement<{ fallback: ReactElement; children: ReactElement<{ searchParams?: unknown; params?: unknown }> }> }>;

/** Contenu sous la limite d'erreur puis `<Suspense>`. */
function suspended(tree: Tree) {
  const suspense = tree.props.children;
  return { fallback: suspense.props.fallback, content: suspense.props.children };
}

describe("pages du catalogue et des souhaits", () => {
  it("WC01 : liste sous Suspense avec sa silhouette", () => {
    const searchParams = Promise.resolve({});
    const { fallback, content } = suspended(catalogPage.default({ searchParams } as never) as Tree);
    expect(catalogPage.metadata).toEqual({ title: "Catalogue" });
    expect(fallback.type).toBe(LearnerCatalogSkeleton);
    expect(content.type).toBe(LearnerCatalog);
    expect(content.props.searchParams).toBe(searchParams);
  });

  it("WC04 : fiche sous Suspense, titre de la page = titre du parcours", async () => {
    const params = Promise.resolve({ slug: "initiation-scratch" });
    const { fallback, content } = suspended(coursePage.default({ params } as never) as Tree);
    expect(fallback.type).toBe(CourseDetailSkeleton);
    expect(content.type).toBe(LearnerCourseView);
    getCourse.mockResolvedValueOnce(courseDetail());
    expect(await coursePage.generateMetadata({ params } as never)).toEqual({ title: "Initiation à Scratch" });
    getCourse.mockRejectedValueOnce(new Error("panne"));
    expect(await coursePage.generateMetadata({ params } as never)).toEqual({ title: "Parcours introuvable" });
  });

  it("WC04 : 404 dans le shell, en h2, retour au catalogue", () => {
    render(<CourseNotFound />);
    expect(screen.getByRole("heading", { level: 2, name: "Ce parcours est introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour au catalogue" })).toHaveAttribute("href", "/apprenant/catalogue");
  });

  it("WW01 : souhaits sous Suspense avec leur silhouette", () => {
    const searchParams = Promise.resolve({});
    const { fallback, content } = suspended(wishlistPage.default({ searchParams } as never) as Tree);
    expect(wishlistPage.metadata).toEqual({ title: "Mes souhaits" });
    expect(fallback.type).toBe(WishlistSkeleton);
    expect(content.type).toBe(WishlistView);
  });
});
