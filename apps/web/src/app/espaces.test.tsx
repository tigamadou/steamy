import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { RoleGate } from "@/components/auth/RoleGate";
import { SpaceWaiting } from "@/components/auth/SpaceWaiting";

vi.mock("@/components/auth/RoleGate", () => ({ RoleGate: () => null }));
vi.mock("@/components/auth/SpaceWaiting", () => ({ SpaceWaiting: () => null }));

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

describe.each([
  ["parent", "parent", () => import("./(parent)/parent/page")],
  ["enseignant", "teacher", () => import("./(enseignant)/enseignant/page")],
] as const)("espace %s en attente de son lot", (_, role, page) => {
  it("affiche la page d'attente du rôle", async () => {
    const { default: Page } = await page();
    const tree = Page() as ReactElement<{ role: string }>;
    expect(tree.type).toBe(SpaceWaiting);
    expect(tree.props.role).toBe(role);
  });
});
