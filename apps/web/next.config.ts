import path from "node:path";

import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image Docker minimale : serveur Node autonome (.next/standalone)
  output: "standalone",
  // Monorepo : tracer les dépendances depuis la racine du dépôt
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  // Le client d'API est livré en TypeScript source
  transpilePackages: ["@steamy/api-client"],
  cacheComponents: true,
  // Liens à jeton (SMS de consentement, email d'invitation) : le jeton ne fuit pas vers un site tiers par le Referer
  async headers() {
    return [
      ...["/consentement/:path*", "/activation/:path*", "/boutique/commandes/:path*"].map((source) => ({
        source,
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      })),
      // Seules iframes admises : le lecteur Vimeo (ADR 0004, point 5). Les pages qui l'intègrent gardent la
      // politique de référent par défaut, dont dépend la restriction de domaine de Vimeo.
      { source: "/:path*", headers: [{ key: "Content-Security-Policy", value: "frame-src https://player.vimeo.com" }] },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Contenu éditorial en MDX (D10, src/content/) : importé par les pages, jamais routé directement.
const withMDX = createMDX();

export default withMDX(nextConfig);
