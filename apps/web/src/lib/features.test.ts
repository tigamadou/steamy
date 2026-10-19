import { describe, expect, it } from "vitest";

import { features } from "./features";

describe("features", () => {
  it("garde fermées les fonctionnalités qui attendent API-L3b, API-L4 et API-L5", () => {
    expect(features).toEqual({
      unlock: false,
      orders: false,
      parentTeacherComments: false,
    });
  });
});
