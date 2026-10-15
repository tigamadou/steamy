import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const gate = vi.fn();
vi.mock("@/components/auth/ProfileGate", () => ({
  ProfileGate: ({ children, ...props }: { role: string; steps: (string | null)[]; children: (user: object) => ReactNode }) => {
    gate(props);
    return children({ role: "parent", profileStep: null, firstName: "Koffi" });
  },
}));
vi.mock("./LinkedChildren", () => ({ LinkedChildren: () => <p>Enfants rattachés</p> }));

const { default: ParentWelcomePage, metadata } = await import("./page");

describe("ParentWelcomePage (WP10)", () => {
  it("souhaite la bienvenue au parent et mène à son espace", async () => {
    const { container } = render(<ParentWelcomePage />);
    expect(metadata.title).toBe("Bienvenue sur Steamy");
    expect(gate).toHaveBeenCalledWith({ role: "parent", steps: [null] });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bienvenue, Koffi !");
    expect(screen.getByText("Enfants rattachés")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Aller sur mon tableau de bord" })).toHaveAttribute("href", "/parent");
    expect(screen.getByRole("link", { name: "Ajouter un enfant" })).toHaveAttribute("href", "/parent/enfants/ajouter");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("affiche un chargement pendant la garde", () => {
    const page = ParentWelcomePage() as ReactElement<{ fallback: ReactNode }>;
    render(<>{page.props.fallback}</>);
    expect(screen.getByText("Chargement…")).toBeInTheDocument();
  });
});
