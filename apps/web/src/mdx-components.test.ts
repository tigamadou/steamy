import { describe, expect, it } from "vitest";

import { articleComponents } from "@/components/public/mdx";

import { useMDXComponents } from "./mdx-components";

describe("useMDXComponents", () => {
  it("applique par défaut la typographie des articles", () => {
    expect(useMDXComponents()).toBe(articleComponents);
  });
});
