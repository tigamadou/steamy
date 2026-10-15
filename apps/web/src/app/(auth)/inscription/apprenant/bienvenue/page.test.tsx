import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const steps = vi.fn();
let me: object;
vi.mock("@/components/auth/ProfileGate", () => ({
  ProfileGate: ({ steps: allowed, children }: { steps: (string | null)[]; children: (user: object) => ReactNode }) => {
    steps(allowed);
    return children(me);
  },
}));

const { default: LearnerWelcomePage, metadata } = await import("./page");

describe("LearnerWelcomePage (W15)", () => {
  beforeEach(() => {
    me = { role: "learner", profileStep: null, firstName: "Awa", avatar: { code: "robot", emoji: "🤖" } };
  });

  it("souhaite la bienvenue avec l'avatar choisi et mène aux parcours gratuits", async () => {
    const { container } = render(<LearnerWelcomePage />);
    expect(metadata.title).toBe("Bienvenue sur Steamy");
    expect(steps).toHaveBeenCalledWith([null]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bienvenue, Awa !");
    expect(screen.getByText("🤖")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir les parcours gratuits" })).toHaveAttribute(
      "href",
      "/apprenant/catalogue?prix=gratuit",
    );
    expect(screen.getByRole("link", { name: "Aller sur mon tableau de bord" })).toHaveAttribute("href", "/apprenant");
    expect(screen.queryByText(/1 parcours gratuit débloqué/)).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("affiche les initiales sans avatar", () => {
    me = { role: "learner", profileStep: null, firstName: "Awa", avatar: null };
    render(<LearnerWelcomePage />);
    expect(screen.getByText("AW")).toBeInTheDocument();
  });

  it("affiche un chargement pendant la garde", () => {
    const page = LearnerWelcomePage() as ReactElement<{ fallback: ReactNode }>;
    render(<>{page.props.fallback}</>);
    expect(screen.getByText("Chargement…")).toBeInTheDocument();
  });
});
