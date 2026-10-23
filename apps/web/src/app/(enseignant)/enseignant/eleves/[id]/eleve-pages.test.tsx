import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { LearnerProfile, LearnerProfileSkeleton } from "@/features/teacher/profile/LearnerProfile";

vi.mock("@/features/teacher/profile/LearnerProfile", () => ({
  LearnerProfile: () => null,
  LearnerProfileSkeleton: () => null,
}));

const { default: LearnerPage, metadata } = await import("./page");
const { default: LearnerNotFound } = await import("./not-found");

type Boundary = ReactElement<{ fallback: ReactElement; children: ReactElement<{ params?: unknown; searchParams?: unknown }> }>;

describe("page du profil élève", () => {
  it("WT05 sous Suspense, paramètres transmis", () => {
    const params = Promise.resolve({ id: "21" });
    const searchParams = Promise.resolve({ classe: "3" });
    const tree = LearnerPage({ params, searchParams } as never) as Boundary;
    expect(metadata.title).toBe("Profil de l'élève");
    expect(tree.props.fallback.type).toBe(LearnerProfileSkeleton);
    expect(tree.props.children.type).toBe(LearnerProfile);
    expect(tree.props.children.props.params).toBe(params);
    expect(tree.props.children.props.searchParams).toBe(searchParams);
  });

  it("élève introuvable : h2, sans distinguer « interdit »", () => {
    render(<LearnerNotFound />);
    expect(screen.getByRole("heading", { level: 2, name: "Cet élève est introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir mes classes" })).toHaveAttribute("href", "/enseignant/classes");
  });
});
