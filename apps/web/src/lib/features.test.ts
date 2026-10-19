import { describe, expect, it } from "vitest";

import { features } from "./features";

describe("features", () => {
  it("garde fermées les fonctionnalités qui attendent API-L3b et API-L4", () => {
    expect(features).toEqual({
      unlock: false,
      orders: false,
      deliveryAddress: false,
      parentInfo: false,
      accountDeletion: false,
    });
  });
});
