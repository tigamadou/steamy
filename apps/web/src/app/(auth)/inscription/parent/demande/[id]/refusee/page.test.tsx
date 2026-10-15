import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const gate = vi.fn();
vi.mock("../RequestGate", () => ({
  RequestGate: ({ children, ...props }: { params: unknown; children: (r: object, me: object) => ReactNode }) => {
    gate(props);
    return children({ id: 7, status: "refused", firstName: "Awa" }, { role: "parent", profileStep: null });
  },
}));

const { default: ConsentRefusedPage, metadata } = await import("./page");

const props = { params: Promise.resolve({ id: "7" }), searchParams: Promise.resolve({}) };

describe("ConsentRefusedPage (WP12)", () => {
  it("confirme le refus et ramène à l'espace du parent", async () => {
    const { container } = render(<ConsentRefusedPage {...props} />);
    expect(metadata.title).toBe("Demande refusée");
    expect(gate).toHaveBeenLastCalledWith({ params: expect.any(Promise) });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Demande refusée");
    expect(screen.getByText("Awa verra votre décision. Aucune inscription n'a été créée.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/parent");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("affiche un chargement pendant la garde", () => {
    const page = ConsentRefusedPage(props) as ReactElement<{ fallback: ReactNode }>;
    render(<>{page.props.fallback}</>);
    expect(screen.getByText("Chargement…")).toBeInTheDocument();
  });
});
