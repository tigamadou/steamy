import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const hasCookie = vi.fn<() => boolean>();
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("next/headers", () => ({ cookies: async () => ({ has: hasCookie }) }));
vi.mock("next/navigation", () => ({ redirect }));

const { SignedInRedirect } = await import("./SignedInRedirect");

describe("SignedInRedirect", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    hasCookie.mockReset();
  });

  it("ne rend rien et n'appelle pas l'API sans cookie de session", async () => {
    hasCookie.mockReturnValue(false);
    await expect(SignedInRedirect({})).resolves.toBeNull();
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it("laisse passer une session qui n'est pas une connexion (inscription en cours)", async () => {
    hasCookie.mockReturnValue(true);
    getCurrentUser.mockResolvedValue(null);
    await expect(SignedInRedirect({})).resolves.toBeNull();
  });

  it("renvoie un utilisateur connecté vers la cible ou son espace", async () => {
    hasCookie.mockReturnValue(true);
    getCurrentUser.mockResolvedValue({ role: "parent", profileStep: null });
    await expect(SignedInRedirect({})).rejects.toThrow("redirect:/parent");
    await expect(SignedInRedirect({ target: "/parent/demandes/1" })).rejects.toThrow("redirect:/parent/demandes/1");
  });
});
