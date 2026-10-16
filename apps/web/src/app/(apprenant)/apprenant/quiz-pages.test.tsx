import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
}));
vi.mock("@/features/learning/quiz/QuizView", () => ({ QuizView: () => null }));
vi.mock("@/features/learning/quiz/QuizResult", () => ({ QuizResult: () => null }));
vi.mock("@/features/learning/quiz/BadgeScreen", () => ({ BadgeScreen: () => null }));

const { default: QuizPage } = await import("./(shell)/parcours/[slug]/quiz/[quizId]/page");
const { default: ResultPage } = await import("./(shell)/parcours/[slug]/quiz/[quizId]/resultats/[attemptId]/page");
const { default: LevelBadgePage } = await import("./(plein-ecran)/parcours/[slug]/niveaux/[levelId]/badge/page");
const { default: ProjectBadgePage } = await import("./(plein-ecran)/parcours/[slug]/projets/[projectId]/badge/page");

type Boundary = ReactElement<{ children: ReactElement<Record<string, unknown>> }>;
const props = (params: object, searchParams: object = {}) =>
  ({ params: Promise.resolve(params), searchParams: Promise.resolve(searchParams) }) as never;

describe("pages des quiz", () => {
  it("WJ04/WJ10 et WJ05/WJ08 passent les identifiants de l'API et refusent les autres", async () => {
    let tree = (await QuizPage(props({ slug: "robot", quizId: "201" }))) as Boundary;
    expect(tree.props.children.props).toEqual({ slug: "robot", quizId: 201 });
    tree = (await ResultPage(props({ slug: "robot", quizId: "201", attemptId: "9" }))) as Boundary;
    expect(tree.props.children.props).toEqual({ slug: "robot", attemptId: 9 });
    await expect(QuizPage(props({ slug: "robot", quizId: "x" }))).rejects.toThrow("notFound");
    await expect(ResultPage(props({ slug: "robot", quizId: "1", attemptId: "-2" }))).rejects.toThrow("notFound");
  });

  it("WJ06/WJ11 lisent la tentative dans `?tentative=`", async () => {
    let tree = (await LevelBadgePage(props({ slug: "robot", levelId: "21" }, { tentative: "9" }))) as Boundary;
    expect(tree.props.children.props).toEqual({ slug: "robot", kind: "level", id: 21, attemptId: 9 });
    tree = (await ProjectBadgePage(props({ slug: "robot", projectId: "2" }, { tentative: ["9", "10"] }))) as Boundary;
    expect(tree.props.children.props).toEqual({ slug: "robot", kind: "project", id: 2, attemptId: null });
    await expect(LevelBadgePage(props({ slug: "robot", levelId: "0" }))).rejects.toThrow("notFound");
    await expect(ProjectBadgePage(props({ slug: "robot", projectId: "abc" }))).rejects.toThrow("notFound");
  });
});
