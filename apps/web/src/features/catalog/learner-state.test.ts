import { describe, expect, it, vi } from "vitest";

import { course } from "@/test/api-fixtures";

const GET = vi.fn();
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));

const { getEnrollments, getLearnerCourseState, getWishlist } = await import("./learner-state");

const ok = (data: object) => ({ data, response: new Response(null, { status: 200 }) });

describe("état personnel de l'apprenant sur le catalogue", () => {
  it("lit toutes les pages des souhaits, dans l'ordre demandé", async () => {
    GET.mockReset()
      .mockResolvedValueOnce(ok({ results: [{ course: course({ slug: "a" }), addedAt: "" }], next: "p2" }))
      .mockResolvedValueOnce(ok({ results: [{ course: course({ slug: "b" }), addedAt: "" }], next: null }));
    const items = await getWishlist("title");
    expect(items.map((item) => item.course.slug)).toEqual(["a", "b"]);
    expect(GET).toHaveBeenNthCalledWith(2, "/api/wishlist/", { params: { query: { page: 2, pageSize: 100, sort: "title" } } });
  });

  it("fusionne souhaits et progression des inscriptions", async () => {
    GET.mockReset().mockImplementation(async (path: string) =>
      path === "/api/wishlist/"
        ? ok({ results: [{ course: course({ slug: "robot" }), addedAt: "" }] })
        : ok({ results: [{ course: course({ slug: "scratch" }), progressPct: 40 }] }),
    );
    expect(await getLearnerCourseState()).toEqual({ wished: ["robot"], progress: { scratch: 40 }, degraded: false });
    expect(GET).toHaveBeenCalledWith("/api/wishlist/", { params: { query: { page: 1, pageSize: 100, sort: "recent" } } });
  });

  it("souhaits ou inscriptions en panne : état vide et écran dégradé, sans échec", async () => {
    const down = { error: { code: "SERVER_ERROR", message: "Panne" }, response: new Response(null, { status: 500 }) };
    GET.mockReset().mockImplementation(async (path: string) =>
      path === "/api/wishlist/" ? down : ok({ results: [{ course: course({ slug: "scratch" }), progressPct: 40 }] }),
    );
    expect(await getLearnerCourseState()).toEqual({ wished: [], progress: { scratch: 40 }, degraded: true });
    GET.mockReset().mockImplementation(async (path: string) =>
      path === "/api/wishlist/" ? ok({ results: [{ course: course({ slug: "robot" }), addedAt: "" }] }) : down,
    );
    expect(await getLearnerCourseState()).toEqual({ wished: ["robot"], progress: {}, degraded: true });
  });

  it("une lecture en échec remonte une erreur (limite d'erreur de la page)", async () => {
    GET.mockReset().mockResolvedValueOnce({
      error: { code: "SERVER_ERROR", message: "Panne" },
      response: new Response(null, { status: 500 }),
    });
    await expect(getEnrollments()).rejects.toThrow("Panne");
    GET.mockResolvedValueOnce({ response: new Response(null, { status: 502 }) });
    await expect(getEnrollments()).rejects.toThrow("Lecture impossible (502)");
    GET.mockResolvedValueOnce(ok({}));
    await expect(getEnrollments()).resolves.toEqual([]);
  });
});
