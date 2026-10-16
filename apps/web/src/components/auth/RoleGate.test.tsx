import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const headerValue = vi.fn<() => string | null>();
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});

vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("next/headers", () => ({ headers: async () => ({ get: headerValue }) }));
vi.mock("next/navigation", () => ({ redirect }));

const { RoleGate } = await import("./RoleGate");

describe("RoleGate", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    headerValue.mockReset();
  });

  it("affiche l'espace au bon rôle", async () => {
    getCurrentUser.mockResolvedValue({ role: "parent", profileStep: null });
    await expect(RoleGate({ role: "parent", children: "espace" })).resolves.toBe("espace");
  });

  it("renvoie vers la connexion avec le chemin demandé quand la session a expiré", async () => {
    getCurrentUser.mockResolvedValue(null);
    headerValue.mockReturnValue("/parent/enfants/3");
    await expect(RoleGate({ role: "parent", children: null })).rejects.toThrow(
      "redirect:/connexion?next=%2Fparent%2Fenfants%2F3",
    );
  });

  it("renvoie vers son propre espace un utilisateur d'un autre rôle", async () => {
    getCurrentUser.mockResolvedValue({ role: "learner", profileStep: null });
    await expect(RoleGate({ role: "parent", children: null })).rejects.toThrow("redirect:/apprenant");
  });

  it("renvoie vers l'étape de profil restante un utilisateur au profil incomplet", async () => {
    getCurrentUser.mockResolvedValue({ role: "learner", profileStep: "learner-school" });
    await expect(RoleGate({ role: "learner", children: null })).rejects.toThrow(
      "redirect:/inscription/apprenant/profil/ecole",
    );
  });
});
