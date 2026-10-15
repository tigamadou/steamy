import { afterEach, describe, expect, it, vi } from "vitest";

import { json } from "@/test/api-fixtures";

const cacheTag = vi.fn();
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag }));

const { getCountries } = await import("./referentials");

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("getCountries", () => {
  it("lit les pays du référentiel, en cache", async () => {
    vi.stubEnv("API_URL", "http://api.test");
    const benin = { id: 1, code: "BJ", label: "Bénin", dialCode: "229", phoneRegex: "^01[0-9]{8}$" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json([benin])),
    );
    expect(await getCountries()).toEqual([benin]);
    expect(cacheTag).toHaveBeenCalledWith("referentials");
  });
});
