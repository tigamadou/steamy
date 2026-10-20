import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { ShippingTimeline, type ShippingStep } from "./ShippingTimeline";

const STEPS: ShippingStep[] = [
  { label: "Commande confirmée", meta: "16 oct. à 14:32", state: "done" },
  { label: "En préparation", state: "current" },
  { label: "Expédiée", meta: "À venir", state: "todo" },
];

describe("ShippingTimeline", () => {
  it("liste ordonnée, étape en cours marquée, état lu par les lecteurs d'écran", () => {
    render(<ShippingTimeline steps={STEPS} />);
    const list = screen.getByRole("list", { name: "Suivi de livraison" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Commande confirmée : étape terminée16 oct. à 14:32");
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[1]).toHaveTextContent("En préparation : étape en cours");
    expect(items[2]).not.toHaveAttribute("aria-current");
    expect(items[2]).toHaveTextContent("Expédiée : étape à venir");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<ShippingTimeline steps={STEPS} label="Livraison" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
