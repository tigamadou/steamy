import { beforeEach, describe, expect, it, vi } from "vitest";

const POST = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));

const { login } = await import("./login");

describe("login", () => {
  beforeEach(() => POST.mockReset());

  it("renvoie l'utilisateur connecté", async () => {
    const user = { id: 1, role: "parent" };
    POST.mockResolvedValue({ data: { user, csrfToken: "t" }, response: new Response(null, { status: 200 }) });
    await expect(login("+2290190000001", "Steamy2026")).resolves.toEqual({ ok: true, data: user });
    expect(POST).toHaveBeenCalledWith("/api/auth/login/", {
      body: { identifier: "+2290190000001", password: "Steamy2026" },
    });
  });

  it("renvoie l'échec tel quel", async () => {
    POST.mockResolvedValue({
      error: { code: "INVALID_CREDENTIALS", message: "Identifiant ou mot de passe incorrect." },
      response: new Response(null, { status: 400 }),
    });
    await expect(login("x", "y")).resolves.toMatchObject({ ok: false, code: "INVALID_CREDENTIALS" });
  });
});
