import type { MetadataRoute } from "next";

import { SITE_URL } from "@/content/site";

// Production indexable ; le staging est servi avec `X-Robots-Tag: noindex` par l'ingress (§4.6, SPEC-TECHNIQUE).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/runtime-config"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
