import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { courseDetail } from "@/test/api-fixtures";

const getCourse = vi.fn();
vi.mock("@/lib/catalog", () => ({ getCourse }));
vi.mock("@/components/public/course-sections", () => ({ CourseView: () => <p>fiche</p> }));

const page = await import("./page");
const { default: CourseNotFound, metadata } = await import("./not-found");

const props = (slug: string) => ({ params: Promise.resolve({ slug }) }) as PageProps<"/parcours/[slug]">;

describe("WL22 · route", () => {
  it("place la fiche sous Suspense", () => {
    render(page.default(props("x")));
    expect(screen.getByText("fiche")).toBeInTheDocument();
  });

  it("métadonnées du parcours, ou « introuvable » (non publié, API en panne)", async () => {
    getCourse.mockResolvedValueOnce(courseDetail());
    expect(await page.generateMetadata(props("initiation-scratch"))).toMatchObject({
      title: "Initiation à Scratch",
      alternates: { canonical: "/parcours/initiation-scratch" },
    });
    getCourse.mockResolvedValueOnce(null);
    expect(await page.generateMetadata(props("brouillon"))).toEqual({ title: "Parcours introuvable" });
    getCourse.mockRejectedValueOnce(new Error("panne"));
    expect(await page.generateMetadata(props("x"))).toEqual({ title: "Parcours introuvable" });
  });

  it("404 propre au parcours, qui renvoie au catalogue", () => {
    render(<CourseNotFound />);
    expect(screen.getByRole("heading", { name: "Ce parcours est introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir tous les parcours" })).toHaveAttribute("href", "/parcours");
    expect(metadata.title).toBe("Parcours introuvable");
  });
});
