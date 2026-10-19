import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { WKQtyStepper } from "./WKQtyStepper";

describe("WKQtyStepper", () => {
  it("diminue et augmente par deux vrais boutons nommés", async () => {
    const onChange = vi.fn();
    render(<WKQtyStepper value={2} onChange={onChange} itemName="Steamy Bot" />);
    expect(screen.getByRole("group", { name: "Quantité de Steamy Bot" })).toHaveTextContent("2");
    await userEvent.click(screen.getByRole("button", { name: "Retirer un exemplaire de Steamy Bot" }));
    expect(onChange).toHaveBeenLastCalledWith(1);
    await userEvent.click(screen.getByRole("button", { name: "Ajouter un exemplaire de Steamy Bot" }));
    expect(onChange).toHaveBeenLastCalledWith(3);
  });

  it("bornée par min et par le max du serveur ; sans max, « + » reste actif", () => {
    const { rerender } = render(<WKQtyStepper value={1} onChange={vi.fn()} itemName="Bot" max={1} />);
    expect(screen.getByRole("button", { name: /Retirer/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Ajouter/ })).toBeDisabled();
    rerender(<WKQtyStepper value={1} onChange={vi.fn()} itemName="Bot" />);
    expect(screen.getByRole("button", { name: /Ajouter/ })).toBeEnabled();
    rerender(<WKQtyStepper value={3} onChange={vi.fn()} itemName="Bot" disabled />);
    expect(screen.getByRole("button", { name: /Retirer/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Ajouter/ })).toBeDisabled();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<WKQtyStepper value={2} onChange={vi.fn()} itemName="Bot" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
