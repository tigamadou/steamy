import { afterEach, describe, expect, it, vi } from "vitest";

import { clearFlow, FLOW_KEYS, readFlow, writeFlow } from "./flow-storage";

describe("flow-storage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("écrit, relit et efface une valeur JSON sous le préfixe des parcours", () => {
    writeFlow("parentChallenge", { challengeId: "c-1" });
    expect(sessionStorage.getItem("steamy:parentChallenge")).toBe('{"challengeId":"c-1"}');
    expect(readFlow("parentChallenge")).toEqual({ challengeId: "c-1" });
    clearFlow("parentChallenge");
    expect(readFlow("parentChallenge")).toBeNull();
    expect(FLOW_KEYS.consentToken).toBe("steamy:consentToken");
  });

  it("renvoie null pour une valeur illisible", () => {
    sessionStorage.setItem(FLOW_KEYS.consentToken, "{");
    expect(readFlow("consentToken")).toBeNull();
  });

  it("supporte un stockage indisponible", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("plein");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("bloqué");
    });
    expect(() => writeFlow("consentToken", "t")).not.toThrow();
    expect(() => clearFlow("consentToken")).not.toThrow();
  });
});
