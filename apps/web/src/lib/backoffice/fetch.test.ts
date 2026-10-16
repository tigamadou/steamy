import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});
const notFound = vi.fn(() => {
  throw new Error("notFound");
});
const backofficeLoginUrl = vi.fn(async (path: string | null) => `login?next=${path}`);

vi.mock("next/navigation", () => ({ redirect, notFound }));
vi.mock("next/headers", () => ({ headers: async () => ({ get: () => "/backoffice/impact" }) }));
vi.mock("./guard", () => ({ backofficeLoginUrl }));

const { backofficeData } = await import("./fetch");

const reply = (status: number, body?: object) =>
  Promise.resolve({
    data: status < 300 ? body : undefined,
    error: status >= 300 ? body : undefined,
    response: new Response(null, { status }),
  }) as never;

describe("lecture d'un endpoint du back-office", () => {
  beforeEach(() => {
    redirect.mockClear();
    backofficeLoginUrl.mockClear();
  });

  it("renvoie les données", async () => {
    await expect(backofficeData(reply(200, { users: 3 }))).resolves.toEqual({ users: 3 });
  });

  it.each([
    ["une session expirée", 401, { code: "NOT_AUTHENTICATED" }],
    ["une session non vérifiée par TOTP", 403, { code: "OTP_REQUIRED" }],
  ])("renvoie %s vers WAD15 avec retour à la page", async (_, status, body) => {
    await expect(backofficeData(reply(status, body))).rejects.toThrow("redirect:login?next=/backoffice/impact");
    expect(backofficeLoginUrl).toHaveBeenCalledWith("/backoffice/impact");
  });

  it("renvoie un groupe insuffisant vers l'accès refusé", async () => {
    await expect(backofficeData(reply(403, { code: "PERMISSION_DENIED" }))).rejects.toThrow(
      "redirect:/backoffice/acces-refuse",
    );
  });

  it("traite une ressource inconnue en 404", async () => {
    await expect(backofficeData(reply(404, { code: "NOT_FOUND" }))).rejects.toThrow("notFound");
  });

  it("laisse toute autre erreur à error.tsx", async () => {
    await expect(backofficeData(reply(500))).rejects.toThrow("réponse inattendue de l'API (500)");
    await expect(backofficeData(reply(400, { code: "VALIDATION_ERROR" }))).rejects.toThrow("(400)");
  });
});
