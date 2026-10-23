import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { AddLearners, AddLearnersSkeleton } from "@/features/teacher/learners/AddLearners";

vi.mock("@/features/teacher/learners/AddLearners", () => ({ AddLearners: () => null, AddLearnersSkeleton: () => null }));

const { default: AddPage, metadata } = await import("./ajouter/page");

type Boundary = ReactElement<{ fallback: ReactElement; children: ReactElement<{ searchParams?: unknown }> }>;

describe("pages des élèves", () => {
  it("WT06 sous Suspense, paramètres transmis", () => {
    const searchParams = Promise.resolve({ classe: "3" });
    const tree = AddPage({ searchParams } as never) as Boundary;
    expect(metadata.title).toBe("Ajouter des élèves");
    expect(tree.props.fallback.type).toBe(AddLearnersSkeleton);
    expect(tree.props.children.type).toBe(AddLearners);
    expect(tree.props.children.props.searchParams).toBe(searchParams);
  });
});
