import { describe, expect, it } from "vitest";

import { features } from "./features";

describe("features", () => {
  it("garde fermées les fonctionnalités qui attendent API-L3b", () => {
    expect(features).toEqual({ unlock: false, events: false });
  });
});
