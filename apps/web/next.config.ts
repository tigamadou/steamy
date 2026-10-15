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
