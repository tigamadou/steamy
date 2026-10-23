import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { TeacherReviews, TeacherReviewsSkeleton } from "@/features/teacher/reviews/TeacherReviews";

vi.mock("@/features/teacher/reviews/TeacherReviews", () => ({ TeacherReviews: () => null, TeacherReviewsSkeleton: () => null }));

const { default: ReviewsPage, metadata } = await import("./page");

type Boundary = ReactElement<{ fallback: ReactElement; children: ReactElement<{ searchParams?: unknown }> }>;

describe("page des évaluations", () => {
  it("WT07 sous Suspense, paramètres transmis", () => {
    const searchParams = Promise.resolve({ filtre: "a-revoir" });
    const tree = ReviewsPage({ searchParams } as never) as Boundary;
    expect(metadata.title).toBe("Évaluations");
    expect(tree.props.fallback.type).toBe(TeacherReviewsSkeleton);
    expect(tree.props.children.type).toBe(TeacherReviews);
    expect(tree.props.children.props.searchParams).toBe(searchParams);
  });
});
