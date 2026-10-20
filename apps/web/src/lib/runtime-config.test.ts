import { afterEach, describe, expect, it, vi } from "vitest";

import { publicApiUrl } from "./runtime-config";

describe("publicApiUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("URL publique de l'API sans barre finale ; exigée", () => {
    vi.stubEnv("PUBLIC_API_URL", "https://api.steamy.test//");
    expect(publicApiUrl()).toBe("https://api.steamy.test");
    vi.stubEnv("PUBLIC_API_URL", "");
    expect(() => publicApiUrl()).toThrow("PUBLIC_API_URL n'est pas défini");
  });
});
