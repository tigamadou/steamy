import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { PendingPill } from "./PendingPill";

describe("PendingPill", () => {
  it("annonce l'attente avec des points animés par défaut", () => {
    render(<PendingPill label="En attente de la réponse…" className="mt-2" />);
    const pill = screen.getByRole("status");
    expect(pill).toHaveTextContent("En attente de la réponse…");
    expect(pill).toHaveClass("bg-amber-100", "mt-2");
    expect(pill.querySelector("[aria-hidden]")).toBeInTheDocument();
  });

  it("montre l'état réglé sans animation", () => {
    render(<PendingPill label="Réponse reçue" status="done" />);
    const pill = screen.getByRole("status");
    expect(pill).toHaveClass("bg-success-100");
    expect(pill).not.toHaveClass("bg-amber-100");
    expect(pill.querySelector("[aria-hidden]")).not.toBeInTheDocument();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <>
        <PendingPill label="En attente" />
        <PendingPill label="Fait" status="done" />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
