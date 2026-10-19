import { describe, expect, it, vi } from "vitest";

const calls: unknown[][] = [];
const respond = (status: number, body: object = {}) =>
  vi.fn(async (...args: unknown[]) => {
    calls.push(args);
    return { ...body, response: new Response(null, { status }) };
  });
const client = { PUT: respond(201, { data: { addedAt: "x" } }), DELETE: respond(204), POST: respond(201, { data: { id: 1 } }) };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => client }));

const { addToWishlist, enroll, failureMessage, removeFromWishlist } = await import("./api");

describe("écritures du catalogue de l'apprenant", () => {
  it("ajoute, retire et inscrit par le client généré", async () => {
    expect(await addToWishlist("robot")).toEqual({ ok: true, data: { addedAt: "x" } });
    expect(client.PUT).toHaveBeenCalledWith("/api/wishlist/{course_slug}/", {
      params: { path: { course_slug: "robot" } },
    });
    expect(await removeFromWishlist("robot")).toEqual({ ok: true, data: undefined });
    expect(client.DELETE).toHaveBeenCalledWith("/api/wishlist/{course_slug}/", {
      params: { path: { course_slug: "robot" } },
    });
    expect(await enroll("robot")).toEqual({ ok: true, data: { id: 1 } });
    expect(client.POST).toHaveBeenCalledWith("/api/learning/enrollments/", { body: { courseSlug: "robot" } });
  });

  it("message d'échec au tutoiement, rien en cas de succès", () => {
    expect(failureMessage({ ok: true, data: 1 })).toBeNull();
    expect(
      failureMessage({ ok: false, code: "PAYMENT_REQUIRED", message: "Ce parcours est payant.", fields: {} }),
    ).toBe("Ce parcours est payant.");
    expect(failureMessage({ ok: false, code: "NETWORK_UNAVAILABLE", message: "", fields: {} })).toMatch(
      /Vérifie ta connexion/,
    );
  });
});
