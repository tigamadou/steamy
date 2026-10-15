import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Un client public qui lirait les cookies ou les en-têtes rendrait les pages dynamiques : on le fait échouer.
const cookies = vi.fn(() => {
  throw new Error("cookies() interdit dans getPublicApi");
});
const headers = vi.fn(() => {
  throw new Error("headers() interdit dans getPublicApi");
});
vi.mock("next/headers", () => ({ cookies, headers }));

const { getPublicApi, PUBLIC_API_TIMEOUT_MS } = await import("./api-public");

describe("getPublicApi", () => {
  let requests: Request[];

  beforeEach(() => {
    requests = [];
    vi.stubEnv("API_URL", "http://api.test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        requests.push(request);
        return new Response(JSON.stringify({ status: "ok" }), {
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("appelle l'API sans cookie ni en-tête du visiteur", async () => {
    const { data } = await getPublicApi().GET("/api/health/");

    expect(data).toEqual({ status: "ok" });
    expect(requests[0].url).toBe("http://api.test/api/health/");
    expect(requests[0].headers.get("Cookie")).toBeNull();
    expect(requests[0].credentials).not.toBe("include");
    expect(cookies).not.toHaveBeenCalled();
    expect(headers).not.toHaveBeenCalled();
  });

  it("borne chaque appel par un délai", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    await getPublicApi().GET("/api/health/");
    await getPublicApi(1200).GET("/api/health/");

    expect(timeout).toHaveBeenNthCalledWith(1, PUBLIC_API_TIMEOUT_MS);
    expect(timeout).toHaveBeenNthCalledWith(2, 1200);
    expect(requests[0].signal).toBeInstanceOf(AbortSignal);
  });

  it("exige API_URL", () => {
    vi.stubEnv("API_URL", "");
    expect(() => getPublicApi()).toThrow("API_URL n'est pas défini");
  });
});
