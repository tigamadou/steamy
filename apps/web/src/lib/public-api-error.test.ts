import { describe, expect, it } from "vitest";

import { PublicApiError, unwrap } from "./public-api-error";

const response = (status: number) => new Response(null, { status });

describe("unwrap", () => {
  it("renvoie les données d'une réponse réussie", () => {
    expect(unwrap({ data: [1], response: response(200) })).toEqual([1]);
  });

  it("lève PublicApiError avec le message de l'API ou un message générique", () => {
    expect(() =>
      unwrap({ error: { code: "THROTTLED", message: "Trop de requêtes" }, response: response(429) }),
    ).toThrow(new PublicApiError(429, { message: "Trop de requêtes" }));
    try {
      unwrap({ response: response(502) });
    } catch (error) {
      expect(error).toBeInstanceOf(PublicApiError);
      expect((error as PublicApiError).status).toBe(502);
      expect((error as PublicApiError).message).toBe("Réponse inattendue de l'API (502)");
    }
  });
});
