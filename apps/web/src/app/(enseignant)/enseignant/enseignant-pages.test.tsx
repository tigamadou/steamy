import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { AppShellSkeleton } from "@/components/ds/AppShell";
import { TeacherHome, TeacherHomeSkeleton } from "@/features/teacher/home/TeacherHome";
import { TeacherShell } from "@/features/teacher/shell/TeacherShell";

const back = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ back }) }));
vi.mock("@/features/teacher/shell/TeacherShell", () => ({ TeacherShell: () => null }));
vi.mock("@/features/teacher/home/TeacherHome", () => ({ TeacherHome: () => null, TeacherHomeSkeleton: () => null }));

const { default: Layout } = await import("./layout");
const { default: HomePage, metadata } = await import("./page");
const { default: TeacherLoading } = await import("./loading");
const { default: TeacherError } = await import("./error");
const { default: TeacherNotFound } = await import("./not-found");

type Boundary = ReactElement<{
  fallback: ReactElement<{ label?: string; navCount?: number }>;
  children: ReactElement<{ children?: unknown }>;
}>;

describe("layout du shell enseignant", () => {
  it("rend le shell sous Suspense, avec son squelette au vouvoiement", () => {
    const tree = Layout({ children: "page" } as never) as Boundary;
    expect(tree.props.fallback.type).toBe(AppShellSkeleton);
    expect(tree.props.fallback.props).toMatchObject({ label: "Chargement de votre espace…", navCount: 7 });
    expect(tree.props.children.type).toBe(TeacherShell);
    expect(tree.props.children.props.children).toBe("page");
  });
});

describe("pages de l'espace enseignant", () => {
  it("WT01 : accueil sous Suspense, avec son squelette", () => {
    const tree = HomePage() as Boundary;
    expect(metadata.title).toBe("Accueil");
    expect(tree.props.fallback.type).toBe(TeacherHomeSkeleton);
    expect(tree.props.children.type).toBe(TeacherHome);
  });
});

describe("états de l'espace enseignant", () => {
  it("chargement au vouvoiement", () => {
    render(<TeacherLoading />);
    expect(screen.getByRole("status")).toHaveTextContent(/votre|vous/i);
  });

  it("erreur : réessayer ou revenir, sous le h1 du shell", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(<TeacherError error={new Error("boom")} retry={retry} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(retry).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Retour/ }));
    expect(back).toHaveBeenCalled();
  });

  it("introuvable : h2 et retour à l'accueil de l'enseignant", () => {
    render(<TeacherNotFound />);
    expect(screen.getByRole("heading", { level: 2, name: "Cette page est introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/enseignant");
  });
});
