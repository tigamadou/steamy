import { describe, expect, it } from "vitest";

import robots from "./robots";
import sitemap, { SITEMAP_PATHS } from "./sitemap";

describe("SEO", () => {
  it("robots.txt : tout indexer sauf la configuration d'exécution, sitemap du domaine de production", () => {
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/runtime-config"] },
      sitemap: "https://steamy.example/sitemap.xml",
      host: "https://steamy.example",
    });
  });

  it("sitemap.xml : URL absolues des pages publiques", () => {
    expect(SITEMAP_PATHS).toContain("/");
    expect(sitemap()).toEqual(
      SITEMAP_PATHS.map((path) => ({ url: new URL(path, "https://steamy.example").toString() })),
    );
  });
});
