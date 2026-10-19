import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CATEGORY, course, json } from "@/test/api-fixtures";

const cacheLife = vi.fn();
const cacheTag = vi.fn();
vi.mock("next/cache", () => ({ cacheLife, cacheTag }));

const { COURSES_PAGE_SIZE, getCategories, getCourse, getCourseSlugs, getCourses, getHomeCourses, getStarterCourses } =
  await import("./catalog");

let routes: Record<string, () => Response>;
let urls: string[];

beforeEach(() => {
  urls = [];
  routes = {};
  vi.stubEnv("API_URL", "http://api.test");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const url = new URL(request.url);
      urls.push(url.pathname + url.search);
      const handler = routes[url.pathname + url.search] ?? routes[url.pathname];
      return handler ? handler() : json({ code: "NOT_FOUND", message: "Introuvable" }, 404);
    }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("catalogue public", () => {
  it("lit les catégories, en cache étiqueté `catalog`", async () => {
    routes["/api/catalog/categories/"] = () => json([CATEGORY]);
    expect(await getCategories()).toEqual([CATEGORY]);
    expect(cacheLife).toHaveBeenCalledWith("minutes");
    expect(cacheTag).toHaveBeenCalledWith("catalog");
  });

  it("lit une page de parcours filtrée", async () => {
    routes["/api/catalog/courses/"] = () => json({ count: 10, next: "http://api.test/x?page=2", results: [course()] });
    const page = await getCourses({ category: "robotique", page: 1 });
    expect(page).toEqual({ count: 10, results: [course()], hasNext: true });
    expect(urls[0]).toBe(`/api/catalog/courses/?category=robotique&page=1&pageSize=${COURSES_PAGE_SIZE}`);
  });

  it("tolère une réponse sans compteur ni résultats", async () => {
    routes["/api/catalog/courses/"] = () => json({});
    expect(await getCourses({})).toEqual({ count: 0, results: [], hasNext: false });
  });

  it("renvoie une liste vide au-delà de la dernière page, et propage les autres erreurs", async () => {
    expect(await getCourses({ page: 99 })).toEqual({ count: 0, results: [], hasNext: false });
    routes["/api/catalog/courses/"] = () => json({ code: "SERVER_ERROR", message: "Panne" }, 500);
    await expect(getCourses({})).rejects.toThrow("Panne");
  });

  it("lit la fiche d'un parcours, `null` s'il n'est pas publié", async () => {
    routes["/api/catalog/courses/robot/"] = () => json({ slug: "robot" });
    expect(await getCourse("robot")).toEqual({ slug: "robot" });
    expect(await getCourse("brouillon")).toBeNull();
  });

  it("accueil : trois parcours, mis en avant puis populaires, sans doublon", async () => {
    const featured = course({ slug: "a" });
    routes["/api/catalog/courses/?featured=true&page=1&pageSize=3"] = () => json({ results: [featured] });
    routes["/api/catalog/courses/?page=1&pageSize=6"] = () =>
      json({ results: [featured, course({ slug: "b" }), course({ slug: "c" }), course({ slug: "d" })] });
    expect((await getHomeCourses()).map((c) => c.slug)).toEqual(["a", "b", "c"]);
  });

  it("accueil : trois parcours mis en avant suffisent", async () => {
    const three = ["a", "b", "c"].map((slug) => course({ slug }));
    routes["/api/catalog/courses/?featured=true&page=1&pageSize=3"] = () => json({ results: three });
    expect(await getHomeCourses()).toEqual(three);
    expect(urls).toHaveLength(1);
  });

  it("WD02 : trois parcours gratuits de difficulté débutant (D27)", async () => {
    routes["/api/catalog/courses/?price=free&difficulty=beginner&page=1&pageSize=3"] = () =>
      json({ results: [course({ slug: "a" })] });
    expect((await getStarterCourses()).map((c) => c.slug)).toEqual(["a"]);
  });

  it("sitemap : tous les slugs, page après page", async () => {
    routes["/api/catalog/courses/?page=1&pageSize=100"] = () =>
      json({ next: "http://api.test/x?page=2", results: [course({ slug: "a" })] });
    routes["/api/catalog/courses/?page=2&pageSize=100"] = () => json({ next: null, results: [course({ slug: "b" })] });
    expect(await getCourseSlugs()).toEqual(["a", "b"]);
  });
});
