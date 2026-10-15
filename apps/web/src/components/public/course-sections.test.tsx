import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { courseDetail } from "@/test/api-fixtures";

vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound }));
const getCourse = vi.fn();
vi.mock("@/lib/catalog", () => ({ getCourse }));

const { CourseView } = await import("./course-sections");

describe("CourseView", () => {
  it("affiche la fiche et ses données structurées Course", async () => {
    getCourse.mockResolvedValue(courseDetail({ isFree: false, price: 18000 }));
    const { container } = render(await CourseView({ params: Promise.resolve({ slug: "initiation-scratch" }) }));
    expect(getCourse).toHaveBeenCalledWith("initiation-scratch");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Initiation à Scratch");
    const jsonLd = JSON.parse(container.querySelector('script[type="application/ld+json"]')!.innerHTML);
    expect(jsonLd).toMatchObject({
      "@type": "Course",
      url: "https://steamy.example/parcours/initiation-scratch",
      offers: { category: "Paid", price: 18000, priceCurrency: "XOF" },
    });
  });

  it("parcours gratuit : offre à 0", async () => {
    getCourse.mockResolvedValue(courseDetail({ price: undefined }));
    const { container } = render(await CourseView({ params: Promise.resolve({ slug: "x" }) }));
    expect(JSON.parse(container.querySelector("script")!.innerHTML).offers).toMatchObject({
      category: "Free",
      price: 0,
    });
  });

  it("parcours payant sans prix renseigné : 0", async () => {
    getCourse.mockResolvedValue(courseDetail({ isFree: false, price: undefined }));
    const { container } = render(await CourseView({ params: Promise.resolve({ slug: "x" }) }));
    expect(JSON.parse(container.querySelector("script")!.innerHTML).offers.price).toBe(0);
  });

  it("404 pour un parcours non publié", async () => {
    getCourse.mockResolvedValue(null);
    await expect(CourseView({ params: Promise.resolve({ slug: "brouillon" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
