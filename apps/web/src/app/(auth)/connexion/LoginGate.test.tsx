import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const hasCookie = vi.fn<() => boolean>();
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("next/headers", () => ({ cookies: async () => ({ has: hasCookie }) }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("./LoginForm", () => ({ LoginForm: () => null }));

const { LoginGate } = await import("./LoginGate");
const { LoginForm } = await import("./LoginForm");

const params = (next?: string | string[]) => Promise.resolve(next === undefined ? {} : { next });

describe("LoginGate", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    hasCookie.mockReset();
  });

  it("affiche le formulaire avec un `next` sûr, sans appeler l'API sans cookie", async () => {
    hasCookie.mockReturnValue(false);
    const tree = await LoginGate({ searchParams: params("/parent/demandes/2") });
    expect(tree.type).toBe(LoginForm);
    expect(tree.props).toEqual({ next: "/parent/demandes/2" });
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it("annonce un compte existant quand WP02 y renvoie (C13)", async () => {
    hasCookie.mockReturnValue(false);
    const tree = await LoginGate({ searchParams: Promise.resolve({ compte: "existant" }) });
    expect(tree.props).toEqual({ next: null, notice: "Vous avez déjà un compte avec ce numéro : connectez-vous." });
  });

  it("ignore un `next` externe ou multiple", async () => {
    hasCookie.mockReturnValue(false);
    expect((await LoginGate({ searchParams: params("https://evil.example") })).props).toEqual({ next: null });
    expect((await LoginGate({ searchParams: params(["/parent", "/apprenant"]) })).props).toEqual({ next: null });
    expect((await LoginGate({ searchParams: params() })).props).toEqual({ next: null });
  });

  it("affiche le formulaire si le cookie ne correspond plus à une session", async () => {
    hasCookie.mockReturnValue(true);
    getCurrentUser.mockResolvedValue(null);
    expect((await LoginGate({ searchParams: params() })).type).toBe(LoginForm);
  });

  it("renvoie un utilisateur déjà connecté vers `next` ou son espace", async () => {
    hasCookie.mockReturnValue(true);
    getCurrentUser.mockResolvedValue({ role: "teacher", profileStep: null });
    await expect(LoginGate({ searchParams: params() })).rejects.toThrow("redirect:/enseignant");
    await expect(LoginGate({ searchParams: params("/enseignant/classes/1") })).rejects.toThrow(
      "redirect:/enseignant/classes/1",
    );
  });
});
