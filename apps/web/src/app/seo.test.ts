import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
const getCourseSlugs = vi.fn();
vi.mock("@/lib/catalog", () => ({ getCourseSlugs }));
const getEventSlugs = vi.fn(async () => ["atelier"]);
vi.mock("@/lib/events", () => ({ getEventSlugs }));

const { default: robots } = await import("./robots");
const { default: sitemap, SITEMAP_PATHS } = await import("./sitemap");

describe("SEO", () => {
  it("robots.txt : tout indexer sauf la configuration d'exécution, sitemap du domaine de production", () => {
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/runtime-config"] },
      sitemap: "https://steamy.example/sitemap.xml",
      host: "https://steamy.example",
    });
  });

  it("sitemap.xml : pages fixes puis fiches des parcours publiés, en URL absolues", async () => {
    getCourseSlugs.mockResolvedValueOnce(["robot"]);
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toEqual([
      ...SITEMAP_PATHS.map((path) => new URL(path, "https://steamy.example").toString()),
      "https://steamy.example/parcours/robot",
      "https://steamy.example/evenements/atelier",
    ]);
    expect(SITEMAP_PATHS).toEqual(
      expect.arrayContaining(["/", "/parcours", "/categories", "/evenements", "/boutique"]),
    );
  });

  it("sitemap.xml : garde les pages fixes si l'API ne répond pas", async () => {
    getCourseSlugs.mockRejectedValueOnce(new Error("panne"));
    getEventSlugs.mockRejectedValueOnce(new Error("panne"));
    expect(await sitemap()).toHaveLength(SITEMAP_PATHS.length);
  });
});
