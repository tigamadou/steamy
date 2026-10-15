import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("next/navigation", () => ({ redirect }));

const { ProfileGate } = await import("./ProfileGate");
const { WELCOME_PATH } = await import("@/lib/auth/home-for-role");

const children = vi.fn(() => "contenu");

describe("ProfileGate", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    children.mockClear();
  });

  it("renvoie à la connexion sans session", async () => {
    getCurrentUser.mockResolvedValue(null);
    await expect(ProfileGate({ role: "learner", steps: ["learner-info"], children })).rejects.toThrow(
      "redirect:/connexion",
    );
    expect(children).not.toHaveBeenCalled();
  });

  it("renvoie un autre rôle vers son espace", async () => {
    getCurrentUser.mockResolvedValue({ role: "parent", profileStep: null });
    await expect(ProfileGate({ role: "learner", steps: ["learner-info"], children })).rejects.toThrow(
      "redirect:/parent",
    );
  });

  it("renvoie vers l'étape réelle quand elle n'est pas celle de l'écran", async () => {
    getCurrentUser.mockResolvedValue({ role: "learner", profileStep: "learner-goals" });
    await expect(ProfileGate({ role: "learner", steps: ["learner-info"], children })).rejects.toThrow(
      "redirect:/inscription/apprenant/profil/objectifs",
    );
  });

  it("renvoie vers la bienvenue du rôle quand le profil est complet", async () => {
    getCurrentUser.mockResolvedValue({ role: "learner", profileStep: null });
    await expect(ProfileGate({ role: "learner", steps: ["learner-avatar"], children })).rejects.toThrow(
      `redirect:${WELCOME_PATH.learner}`,
    );
    getCurrentUser.mockResolvedValue({ role: "parent", profileStep: null });
    await expect(ProfileGate({ role: "parent", steps: ["parent-children"], children })).rejects.toThrow(
      "redirect:/inscription/parent/bienvenue",
    );
  });

  it("rend l'écran avec l'utilisateur quand l'étape est autorisée", async () => {
    const me = { role: "learner", profileStep: null, firstName: "Awa" };
    getCurrentUser.mockResolvedValue(me);
    await expect(ProfileGate({ role: "learner", steps: [null], children })).resolves.toBe("contenu");
    expect(children).toHaveBeenCalledWith(me);
  });
});
