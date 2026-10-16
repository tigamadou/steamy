import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { AppShellSkeleton } from "@/components/ds/AppShell";
import { LearnerShell } from "@/features/shell/LearnerShell";

const back = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ back }) }));
vi.mock("@/features/shell/LearnerShell", () => ({ LearnerShell: () => null }));

const { default: Layout } = await import("./layout");
const { default: LearnerError } = await import("./error");

type Boundary = ReactElement<{ fallback: ReactElement<{ label: string }>; children: ReactElement<{ children: unknown }> }>;

describe("layout du shell apprenant", () => {
  it("rend le shell sous Suspense, avec son squelette", () => {
    const tree = Layout({ children: "page" } as never) as Boundary;
    expect(tree.props.fallback.type).toBe(AppShellSkeleton);
    expect(tree.props.fallback.props.label).toBe("Chargement de ton espace…");
    expect(tree.props.children.type).toBe(LearnerShell);
    expect(tree.props.children.props.children).toBe("page");
  });
});

describe("erreur de l'espace apprenant", () => {
  it("propose de réessayer ou de revenir, sous le h1 du shell", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(<LearnerError error={new Error("boom")} retry={retry} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(retry).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Retour/ }));
    expect(back).toHaveBeenCalled();
  });
});
