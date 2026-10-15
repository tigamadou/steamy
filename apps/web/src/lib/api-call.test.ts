import { describe, expect, it, vi } from "vitest";

const getBrowserApi = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi }));

const { apiCall, errorMessage } = await import("./api-call");

const respond = (status: number, body: object = {}, headers: Record<string, string> = {}) => async () => ({
  ...body,
  response: new Response(null, { status, headers }),
});

describe("apiCall", () => {
  it("renvoie les données d'une réponse réussie, y compris 204", async () => {
    getBrowserApi.mockResolvedValue({});
    await expect(apiCall(respond(200, { data: { a: 1 } }))).resolves.toEqual({ ok: true, data: { a: 1 } });
    await expect(apiCall(respond(204))).resolves.toEqual({ ok: true, data: undefined });
  });

  it("aplatit les erreurs par champ et lit Retry-After", async () => {
    getBrowserApi.mockResolvedValue({});
    const error = {
      code: "VALIDATION_ERROR",
      message: "Données invalides.",
      fields: { phone: [{ code: "PHONE_INVALID", message: "Numéro invalide." }, { code: "x", message: "Autre." }] },
    };
    await expect(apiCall(respond(429, { error }, { "Retry-After": "12" }))).resolves.toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Données invalides.",
      fields: { phone: "Numéro invalide. Autre." },
      retryAfter: 12,
    });
  });

  it("se replie sur SERVER_ERROR sans corps d'erreur", async () => {
    getBrowserApi.mockResolvedValue({});
    await expect(apiCall(respond(502))).resolves.toEqual({
      ok: false,
      code: "SERVER_ERROR",
      message: "",
      fields: {},
      retryAfter: undefined,
    });
  });

  it("signale un réseau injoignable", async () => {
    getBrowserApi.mockRejectedValue(new Error("hors ligne"));
    await expect(apiCall(respond(200))).resolves.toMatchObject({ ok: false, code: "NETWORK_UNAVAILABLE" });
  });
});

describe("errorMessage", () => {
  it.each([
    ["NETWORK_UNAVAILABLE", undefined, "tu", "Vérifie ta connexion internet"],
    ["NETWORK_UNAVAILABLE", undefined, "vous", "Vérifiez votre connexion internet"],
    ["THROTTLED", 30, "tu", "Réessaie dans 30 secondes."],
    ["THROTTLED", undefined, "vous", "Réessayez dans quelques instants."],
    ["SERVER_ERROR", undefined, "tu", "Réessaie dans quelques instants."],
    ["SERVER_ERROR", undefined, "vous", "Réessayez dans quelques instants."],
  ] as const)("%s (%s, %s)", (code, retryAfter, register, text) => {
    expect(errorMessage({ code, message: "", retryAfter }, register)).toContain(text);
  });

  it("reprend le message de l'API, sinon un message générique", () => {
    expect(errorMessage({ code: "PHONE_INVALID", message: "Numéro invalide." }, "vous")).toBe("Numéro invalide.");
    expect(errorMessage({ code: "PHONE_INVALID", message: "" }, "tu")).toBe("Une erreur est survenue. Réessaie.");
    expect(errorMessage({ code: "PHONE_INVALID", message: "" }, "vous")).toBe("Une erreur est survenue. Réessayez.");
  });
});
