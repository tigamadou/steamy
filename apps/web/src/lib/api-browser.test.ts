import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const API_URL = "http://api.test";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Faux réseau : configuration d'exécution, jeton CSRF, puis toute autre requête de l'API. */
function fakeNetwork(runtimeStatus = 200) {
  const requests: Request[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    if (input === "/runtime-config") {
      return runtimeStatus === 200 ? json({ apiUrl: API_URL }) : json({}, runtimeStatus);
    }
    const request = input as Request;
    requests.push(request);
    if (request.url === `${API_URL}/api/auth/csrf/`) {
      return json({ csrfToken: "jeton-api" });
    }
    return new Response(null, { status: 204 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, requests };
}

async function freshModule() {
  vi.resetModules();
  return import("./api-browser");
}

describe("getBrowserApi", () => {
  beforeEach(() => {
    document.cookie = "csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("demande le jeton CSRF à l'API (/api/auth/csrf/) quand le cookie est absent", async () => {
    const { requests } = fakeNetwork();
    const api = await (await freshModule()).getBrowserApi();
    await api.POST("/api/auth/logout/");

    expect(requests.map((r) => r.url)).toEqual([
      `${API_URL}/api/auth/csrf/`,
      `${API_URL}/api/auth/logout/`,
    ]);
    expect(requests[1].headers.get("X-CSRFToken")).toBe("jeton-api");
    expect(requests[1].credentials).toBe("include");
  });

  it("utilise le cookie csrftoken quand il existe", async () => {
    const { requests } = fakeNetwork();
    document.cookie = "csrftoken=jeton%20cookie";
    const api = await (await freshModule()).getBrowserApi();
    await api.POST("/api/auth/logout/");

    expect(requests.map((r) => r.url)).toEqual([`${API_URL}/api/auth/logout/`]);
    expect(requests[0].headers.get("X-CSRFToken")).toBe("jeton cookie");
  });

  it("crée le client une seule fois et réessaie après un échec de configuration", async () => {
    const { getBrowserApi } = await freshModule();
    fakeNetwork(503);
    await expect(getBrowserApi()).rejects.toThrow("Configuration indisponible (503)");

    const { fetchMock } = fakeNetwork();
    const first = await getBrowserApi();
    expect(await getBrowserApi()).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refuse d'être appelé côté serveur", async () => {
    const { getBrowserApi } = await freshModule();
    vi.stubGlobal("window", undefined);
    expect(() => getBrowserApi()).toThrow("réservé au navigateur");
  });
});
