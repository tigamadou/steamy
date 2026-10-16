import { describe, expect, it } from "vitest";

import { localityLabel } from "./api";

describe("localityLabel", () => {
  it("ville et quartier, ou la ville seule", () => {
    expect(localityLabel({ city: "Cotonou", district: "Akpakpa" })).toBe("Cotonou · Akpakpa");
    expect(localityLabel({ city: "Parakou" })).toBe("Parakou");
  });
});
