import { describe, expect, it, vi } from "vitest";

const getBrowserApi = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: () => getBrowserApi() }));

const { callWithStatus } = await import("./call");

describe("callWithStatus", () => {
  it("garde le statut d'une réponse en succès", async () => {
    getBrowserApi.mockResolvedValue({});
    const { result, status } = await callWithStatus(async () => ({ data: { ok: 1 }, response: new Response(null, { status: 201 }) }));
    expect(result).toEqual({ ok: true, data: { ok: 1 } });
    expect(status).toBe(201);
  });

  it("garde le statut et le code d'une erreur de l'API", async () => {
    getBrowserApi.mockResolvedValue({});
    const { result, status } = await callWithStatus(async () => ({
      error: { code: "VALIDATION_ERROR" as const, message: "Déjà fait." },
      response: new Response(null, { status: 409 }),
    }));
    expect(result).toMatchObject({ ok: false, code: "VALIDATION_ERROR", message: "Déjà fait." });
    expect(status).toBe(409);
  });

  it("rend le statut 0 quand le réseau est injoignable", async () => {
    getBrowserApi.mockResolvedValue({});
    const { result, status } = await callWithStatus(async () => {
      throw new Error("réseau");
    });
    expect(result).toMatchObject({ ok: false, code: "NETWORK_UNAVAILABLE" });
    expect(status).toBe(0);
  });
});
