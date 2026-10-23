import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { RoleGate } from "@/components/auth/RoleGate";

vi.mock("@/components/auth/RoleGate", () => ({ RoleGate: () => null }));

type Gate = ReactElement<{ fallback: ReactElement; children: ReactElement<{ role: string; children: unknown }> }>;

describe.each([
  ["apprenant", "learner", () => import("./(apprenant)/layout")],
  ["parent", "parent", () => import("./(parent)/layout")],
  ["enseignant", "teacher", () => import("./(enseignant)/layout")],
] as const)("espace %s", (_, role, layout) => {
  it("garde l'espace par le rôle, sous Suspense", async () => {
    const { default: Layout } = await layout();
    const tree = Layout({ children: "contenu" } as never) as Gate;
    expect(tree.props.fallback).toBeTruthy();
    expect(tree.props.children.type).toBe(RoleGate);
    expect(tree.props.children.props).toEqual({ role, children: "contenu" });
  });
});

describe("espace enseignant : métadonnées", () => {
  it("n'est jamais indexé, y compris ses pages « introuvable » (balise posée par le layout)", async () => {
    const { metadata } = await import("./(enseignant)/layout");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
