import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const connection = vi.fn(async () => undefined);
const jar = new Map<string, string>();
vi.mock("next/server", () => ({ connection }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined) }),
}));

const { getServerApi } = await import("./api");

describe("getServerApi", () => {
  const fetchMock = vi.fn(async () => Response.json({ ok: true }));

  beforeEach(() => {
    jar.clear();
    vi.stubEnv("API_URL", "http://api.test");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("attend la requête puis relaie la session et le jeton CSRF du visiteur", async () => {
    jar.set("sessionid", "s 1").set("csrftoken", "c1");
    const api = await getServerApi();
    expect(connection).toHaveBeenCalled();
    await api.POST("/api/auth/logout/");
    const request = (fetchMock.mock.calls[0] as unknown as [Request])[0];
    expect(request.url).toBe("http://api.test/api/auth/logout/");
    expect(request.headers.get("Cookie")).toBe("sessionid=s%201; csrftoken=c1");
    expect(request.headers.get("X-CSRFToken")).toBe("c1");
  });

  it("n'envoie aucun cookie à un visiteur anonyme", async () => {
    const api = await getServerApi();
    await api.GET("/api/accounts/me/");
    const request = (fetchMock.mock.calls[0] as unknown as [Request])[0];
    expect(request.headers.get("Cookie")).toBeNull();
  });

  it("exige API_URL", async () => {
    vi.stubEnv("API_URL", "");
    await expect(getServerApi()).rejects.toThrow("API_URL n'est pas défini");
  });
});
