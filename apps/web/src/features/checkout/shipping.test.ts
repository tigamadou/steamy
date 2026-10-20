import { describe, expect, it } from "vitest";

import { shippingSteps } from "./shipping";

const zone = { id: 1, name: "Cotonou", delayLabel: "24 à 48 h" };
const states = (steps: ReturnType<typeof shippingSteps>) => steps.map((s) => s.state);

describe("shippingSteps", () => {
  it("en préparation : confirmée, préparation en cours, délai de la zone annoncé", () => {
    const steps = shippingSteps({ paidAt: "2026-10-16T13:32:00Z", shippingStatus: "preparing", deliveryZone: zone });
    expect(states(steps)).toEqual(["done", "current", "todo", "todo"]);
    expect(steps[0].meta).toBe("16 octobre 2026 à 14:32");
    expect(steps[2].meta).toBe("À venir");
    expect(steps[3].meta).toBe("Délai annoncé : 24 à 48 h");
  });

  it("expédiée puis livrée", () => {
    const shipped = shippingSteps({ paidAt: null, shippingStatus: "shipped", deliveryZone: zone });
    expect(states(shipped)).toEqual(["done", "done", "current", "todo"]);
    expect(shipped[0].meta).toBeNull();
    expect(shipped[2].meta).toBeUndefined();
    const delivered = shippingSteps({ paidAt: null, shippingStatus: "delivered", deliveryZone: zone });
    expect(states(delivered)).toEqual(["done", "done", "done", "done"]);
    expect(delivered[3].meta).toBeUndefined();
  });

  it("sans zone : pas de délai", () => {
    const steps = shippingSteps({ paidAt: null, shippingStatus: "preparing", deliveryZone: null as never });
    expect(steps[3].meta).toBeUndefined();
  });
});
