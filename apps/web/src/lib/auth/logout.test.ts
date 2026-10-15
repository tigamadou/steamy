import { beforeEach, describe, expect, it, vi } from "vitest";

const POST = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));

const { clearFlowStorage, logout } = await import("./logout");

describe("logout", () => {
  beforeEach(() => {
    POST.mockReset();
    sessionStorage.clear();
    sessionStorage.setItem("steamy:challengeId", "c-1");
    sessionStorage.setItem("autre", "garde");
  });

  it("ferme la session côté API puis purge les valeurs de parcours de l'onglet", async () => {
    POST.mockResolvedValue({ response: new Response(null, { status: 204 }) });
    await logout();
    expect(POST).toHaveBeenCalledWith("/api/auth/logout/");
    expect(sessionStorage.getItem("steamy:challengeId")).toBeNull();
    expect(sessionStorage.getItem("autre")).toBe("garde");
  });

  it("échoue sans rien purger si l'API refuse", async () => {
    POST.mockResolvedValue({ response: new Response(null, { status: 403 }) });
    await expect(logout()).rejects.toThrow("Déconnexion impossible (403)");
    expect(sessionStorage.getItem("steamy:challengeId")).toBe("c-1");
  });

  it("purge plusieurs clés de parcours d'affilée", () => {
    sessionStorage.setItem("steamy:resumeCode", "x");
    clearFlowStorage();
    expect(sessionStorage.length).toBe(1);
  });
});
