import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const gate = vi.fn();
vi.mock("../RequestGate", () => ({
  RequestGate: ({ children, ...props }: { params: unknown; children: (r: object, me: object) => ReactNode }) => {
    gate(props);
    return children({ id: 7, status: "pending", firstName: "Awa" }, { role: "parent", profileStep: null });
  },
}));
vi.mock("./RefuseForm", () => ({
  RefuseForm: ({ id, firstName }: { id: number; firstName: string }) => (
    <p>
      Refus de la demande {id} de {firstName}
    </p>
  ),
}));

const { default: RefuseRequestPage, metadata } = await import("./page");

const props = { params: Promise.resolve({ id: "7" }), searchParams: Promise.resolve({}) };

describe("RefuseRequestPage (WP11)", () => {
  it("demande le motif du refus de la demande", async () => {
    const { container } = render(<RefuseRequestPage {...props} />);
    expect(metadata.title).toBe("Refuser la demande");
    expect(gate).toHaveBeenLastCalledWith({ params: expect.any(Promise) });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Pourquoi refusez-vous ?");
    expect(screen.getByText("Refus de la demande 7 de Awa")).toBeInTheDocument();
    expect(screen.getAllByText(/refaire une dans 30 jours/)).not.toHaveLength(0);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("affiche un chargement pendant la garde", () => {
    const page = RefuseRequestPage(props) as ReactElement<{ children: ReactElement<{ fallback: ReactNode }> }>;
    render(<>{page.props.children.props.fallback}</>);
    expect(screen.getByText("Chargement de la demande…")).toBeInTheDocument();
  });
});
