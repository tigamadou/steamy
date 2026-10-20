import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
}));
vi.mock("@/features/learning/MyCourses", () => ({
  MyCourses: ({ tab, children }: { tab: string; children: (c: { active: number; completed: number }) => ReactNode }) => (
    <div data-tab={tab}>{children({ active: 2, completed: 1 })}</div>
  ),
  MyCoursesSkeleton: () => <p>squelette</p>,
}));
vi.mock("@/features/learning/CourseTree", () => ({
  CourseTree: ({ slug, expandedProjectId }: { slug: string; expandedProjectId: number | null }) => (
    <p data-testid="arbre">
      {slug} {String(expandedProjectId)}
    </p>
  ),
  CourseTreeSkeleton: () => null,
}));
vi.mock("@/features/unlock/PendingRequestsBanner", () => ({ PendingRequestsBanner: () => <p>bandeau des demandes</p> }));
vi.mock("@/features/unlock/UnlockedToast", () => ({ UnlockedToast: () => <p>Parcours débloqué</p> }));
vi.mock("@/features/learning/ProjectView", () => ({ ProjectView: () => null }));
vi.mock("@/features/learning/LevelView", () => ({ LevelView: () => null }));
vi.mock("@/features/learning/MissionView", () => ({ MissionView: () => null }));

const { default: MyCoursesPage } = await import("./page");
const { default: MyCoursesLoading } = await import("./loading");
const { default: CourseTreePage } = await import("./[slug]/page");
const { default: ProjectPage } = await import("./[slug]/projets/[projectId]/page");
const { default: LevelPage } = await import("./[slug]/niveaux/[levelId]/page");
const { default: MissionPage } = await import("./[slug]/missions/[missionId]/page");

type Boundary = ReactElement<{ children: ReactElement<Record<string, unknown>> }>;

describe("WD23 /apprenant/parcours", () => {
  it("onglet « En cours » par défaut, compteurs dans les onglets", async () => {
    render(await MyCoursesPage({ searchParams: Promise.resolve({}) } as never));
    expect(screen.getByRole("link", { name: "En cours (2)" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Terminés (1)" })).toHaveAttribute("href", "/apprenant/parcours?onglet=termines");
    expect(document.querySelector("[data-tab]")).toHaveAttribute("data-tab", "active");
    expect(screen.getByText("bandeau des demandes")).toBeInTheDocument();
  });

  it("onglet « Terminés » adressable par l'URL", async () => {
    render(await MyCoursesPage({ searchParams: Promise.resolve({ onglet: "termines" }) } as never));
    expect(screen.getByRole("link", { name: "Terminés (1)" })).toHaveAttribute("aria-current", "page");
    expect(document.querySelector("[data-tab]")).toHaveAttribute("data-tab", "completed");
  });

  it("chargement fidèle", () => {
    render(<MyCoursesLoading />);
    expect(screen.getByText("squelette")).toBeInTheDocument();
  });
});

describe("pages de contenu", () => {
  it("WC06 lit le projet déplié dans `?projet=`, et le toast « Parcours débloqué » dans `?debloque=1`", async () => {
    const { unmount } = render(
      await CourseTreePage({
        params: Promise.resolve({ slug: "robot" }),
        searchParams: Promise.resolve({ projet: "2", debloque: "1" }),
      } as never),
    );
    expect(screen.getByTestId("arbre")).toHaveTextContent("robot 2");
    expect(screen.getByText("Parcours débloqué")).toBeInTheDocument();
    unmount();
    render(await CourseTreePage({ params: Promise.resolve({ slug: "robot" }), searchParams: Promise.resolve({}) } as never));
    expect(screen.getByTestId("arbre")).toHaveTextContent("robot null");
    expect(screen.queryByText("Parcours débloqué")).not.toBeInTheDocument();
  });

  it.each([
    ["WJ01", ProjectPage, "projectId"],
    ["WJ02", LevelPage, "levelId"],
    ["WJ03", MissionPage, "missionId"],
  ] as const)("%s passe l'identifiant de l'API, et refuse un identifiant invalide", async (_, Page, param) => {
    const tree = (await Page({ params: Promise.resolve({ slug: "robot", [param]: "12" }) } as never)) as Boundary;
    expect(tree.props.children.props).toEqual({ slug: "robot", [param]: 12 });
    await expect(Page({ params: Promise.resolve({ slug: "robot", [param]: "abc" }) } as never)).rejects.toThrow("notFound");
    await expect(Page({ params: Promise.resolve({ slug: "robot", [param]: "0" }) } as never)).rejects.toThrow("notFound");
  });
});
