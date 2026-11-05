import { afterEach, describe, expect, it, vi } from "vitest";

import { agentMaxWorkers } from "../../vitest.config.mts";

async function loadedMaxWorkers(): Promise<unknown> {
  vi.resetModules();
  const { default: config } = await import("../../vitest.config.mts");
  return config.test?.maxWorkers;
}

describe("parallélisme de Vitest (vitest.config.mts)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("n'impose rien hors environnement d'agent", () => {
    expect(agentMaxWorkers({})).toBeUndefined();
    expect(agentMaxWorkers({ AGENT_LOT: "" })).toBeUndefined();
  });

  it("borne à 2 workers dans un environnement d'agent", () => {
    expect(agentMaxWorkers({ AGENT_LOT: "lot2" })).toBe(2);
  });

  it("laisse VITEST_MAX_WORKERS décider quand il est posé", () => {
    expect(agentMaxWorkers({ AGENT_LOT: "lot2", VITEST_MAX_WORKERS: "3" })).toBeUndefined();
  });

  it("applique la borne à la configuration chargée", async () => {
    vi.stubEnv("AGENT_LOT", "lot2");
    vi.stubEnv("VITEST_MAX_WORKERS", undefined);
    expect(await loadedMaxWorkers()).toBe(2);
  });

  it("ne borne pas la configuration chargée hors agent", async () => {
    vi.stubEnv("AGENT_LOT", undefined);
    expect(await loadedMaxWorkers()).toBeUndefined();
  });
});
