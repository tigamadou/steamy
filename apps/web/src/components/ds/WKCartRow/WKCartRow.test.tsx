import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { WKCartRow, type WKCartRowProps } from "./WKCartRow";

const props: WKCartRowProps = {
  name: "Steamy Bot v1",
  href: "/boutique/steamy-bot-v1",
  emoji: "🤖",
  color: "#5B3FE0",
  priceLabel: "35 000 F CFA",
  totalLabel: "70 000 F CFA",
  quantity: 2,
  onQuantityChange: vi.fn(),
  onRemove: vi.fn(),
};

describe("WKCartRow", () => {
  it("article vers sa fiche, prix unitaire, total, quantité et retrait", async () => {
    const onQuantityChange = vi.fn();
    const onRemove = vi.fn();
    render(<WKCartRow {...props} onQuantityChange={onQuantityChange} onRemove={onRemove} />);
    expect(screen.getByRole("link", { name: "Steamy Bot v1" })).toHaveAttribute("href", "/boutique/steamy-bot-v1");
    expect(screen.getByText("35 000 F CFA")).toBeInTheDocument();
    expect(screen.getByText("70 000 F CFA")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Ajouter un exemplaire/ }));
    expect(onQuantityChange).toHaveBeenCalledWith(3);
    await userEvent.click(screen.getByRole("button", { name: "Retirer Steamy Bot v1" }));
    expect(onRemove).toHaveBeenCalled();
  });

  it("indisponible : badge, quantité figée ; occupé : tout désactivé ; couleur par défaut", () => {
    const { rerender, container } = render(<WKCartRow {...props} color={undefined} unavailable />);
    expect(screen.getByText("Indisponible")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ajouter un exemplaire/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Retirer Steamy Bot v1" })).toBeEnabled();
    expect(container.querySelector<HTMLElement>("[aria-hidden]")?.style.getPropertyValue("--row-color")).toBe(
      "var(--cat-robotique)",
    );
    rerender(<WKCartRow {...props} busy removeLabel="Enlever" />);
    expect(screen.getByRole("button", { name: "Enlever Steamy Bot v1" })).toBeDisabled();
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<WKCartRow {...props} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
