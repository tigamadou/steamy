import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getDeliveryZones = vi.fn();
vi.mock("@/lib/shop", () => ({ getDeliveryZones }));

const { DeliveryZonesSlot } = await import("./DeliveryZonesSlot");

describe("DeliveryZonesSlot (WK10)", () => {
  it("délais et frais lus dans les zones", async () => {
    getDeliveryZones.mockResolvedValue([{ id: 1, country: "BJ", name: "Porto-Novo", fee: 1500, delayLabel: "2 à 3 jours" }]);
    render(await DeliveryZonesSlot({ register: "tu" }));
    expect(screen.getByText("Livraison selon ta zone")).toBeInTheDocument();
    expect(screen.getByText("Porto-Novo")).toBeInTheDocument();
    expect(screen.getByText(/2 à 3 jours · 1\s500 F CFA/)).toBeInTheDocument();
  });

  it("zones vides ou en panne : rien", async () => {
    getDeliveryZones.mockRejectedValue(new Error("panne"));
    expect(await DeliveryZonesSlot({ register: "vous" })).toBeNull();
  });
});
