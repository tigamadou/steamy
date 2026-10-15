import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CourseGridSkeleton } from "./DashboardSkeleton";

describe("CourseGridSkeleton", () => {
  it("annonce le chargement de trois cartes", () => {
    const { container } = render(<CourseGridSkeleton label="Chargement des suggestions…" />);
    expect(screen.getByRole("status", { name: "Chargement des suggestions…" })).toHaveAttribute("aria-busy", "true");
    expect(container.querySelectorAll("[aria-hidden]")).toHaveLength(3);
  });
});
