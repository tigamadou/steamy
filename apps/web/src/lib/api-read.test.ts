import { describe, expect, it } from "vitest";

import { ApiReadError, readOrNull } from "./api-read";

const respond = (status: number, body: { data?: unknown; error?: unknown } = {}) => ({
  ...body,
  response: new Response(null, { status }),
});

describe("readOrNull", () => {
  it("renvoie les données d'une réponse réussie", () => {
    expect(readOrNull(respond(200, { data: { count: 2 } }))).toEqual({ count: 2 });
  });

  it.each([401, 403])("renvoie null sans session ni rôle (%i)", (status) => {
    expect(readOrNull(respond(status, { error: { code: "NOT_AUTHENTICATED" } }))).toBeNull();
  });

  it("lève une erreur avec le message de l'API, ou un message générique", () => {
    expect(() => readOrNull(respond(500, { error: { message: "Panne" } }))).toThrow("Panne");
    const error = (() => {
      try {
        readOrNull(respond(502));
      } catch (e) {
        return e as ApiReadError;
      }
    })();
    expect(error).toBeInstanceOf(ApiReadError);
    expect(error?.status).toBe(502);
    expect(error?.message).toBe("Réponse inattendue de l'API (502)");
  });
});
