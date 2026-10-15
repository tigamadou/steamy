import type { MDXComponents } from "mdx/types";

import { articleComponents } from "@/components/public/mdx";

// Requis par @next/mdx (App Router). Style par défaut du contenu éditorial ; les pages légales passent les leurs.
export function useMDXComponents(): MDXComponents {
  return articleComponents;
}
