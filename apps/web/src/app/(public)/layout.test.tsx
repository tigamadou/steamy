import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const { default: PublicLayout } = await import("./layout");

describe("PublicLayout", () => {
  it("place la page dans le shell public", () => {
    render(PublicLayout({ children: <h1>Accueil</h1> } as LayoutProps<"/">));
    expect(screen.getByRole("main")).toContainElement(screen.getByRole("heading", { name: "Accueil" }));
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
