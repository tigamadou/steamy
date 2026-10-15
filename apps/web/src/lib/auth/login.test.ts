import { beforeEach, describe, expect, it, vi } from "vitest";

const POST = vi.fn();
const getBrowserApi = vi.fn(async () => ({ POST }));
vi.mock("@/lib/api-browser", () => ({ getBrowserApi }));

const { login } = await import("./login");

describe("login", () => {
  beforeEach(() => POST.mockReset());

  it("renvoie l'utilisateur connecté", async () => {
    const user = { id: 1, role: "parent" };
    POST.mockResolvedValue({ data: { user, csrfToken: "t" }, response: new Response(null, { status: 200 }) });
    await expect(login("+2290190000001", "Steamy2026")).resolves.toEqual({ ok: true, user });
    expect(POST).toHaveBeenCalledWith("/api/auth/login/", {
      body: { identifier: "+2290190000001", password: "Steamy2026" },
    });
  });

  it("renvoie le code et le message de l'API", async () => {
    POST.mockResolvedValue({
      error: { code: "INVALID_CREDENTIALS", message: "Identifiant ou mot de passe incorrect." },
      response: new Response(null, { status: 400 }),
    });
    await expect(login("x", "y")).resolves.toEqual({
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: "Identifiant ou mot de passe incorrect.",
      retryAfter: undefined,
    });
  });

  it("transmet le délai d'attente après THROTTLED", async () => {
    POST.mockResolvedValue({
      error: { code: "THROTTLED", message: "Trop de tentatives." },
      response: new Response(null, { status: 429, headers: { "Retry-After": "42" } }),
    });
    await expect(login("x", "y")).resolves.toMatchObject({ code: "THROTTLED", retryAfter: 42 });
  });

  it("signale un réseau indisponible", async () => {
    getBrowserApi.mockRejectedValueOnce(new Error("hors ligne"));
    await expect(login("x", "y")).resolves.toMatchObject({ ok: false, code: "NETWORK_UNAVAILABLE" });
  });
});
