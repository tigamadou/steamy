import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));

const { getCurrentUser } = await import("./session");

describe("getCurrentUser", () => {
  beforeEach(() => GET.mockReset());

  it("renvoie l'utilisateur connecté", async () => {
    const me = { id: 1, role: "learner", firstName: "Léa" };
    GET.mockResolvedValue({ data: me, response: new Response(null, { status: 200 }) });
    await expect(getCurrentUser()).resolves.toBe(me);
    expect(GET).toHaveBeenCalledWith("/api/accounts/me/");
  });

  it.each([401, 403])("renvoie null sans session valide (%i)", async (status) => {
    GET.mockResolvedValue({ error: { code: "NOT_AUTHENTICATED" }, response: new Response(null, { status }) });
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("laisse remonter une panne de l'API", async () => {
    GET.mockResolvedValue({ error: { code: "SERVER_ERROR" }, response: new Response(null, { status: 500 }) });
    await expect(getCurrentUser()).rejects.toThrow("Session illisible (500)");
  });
});
