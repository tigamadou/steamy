import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CERTIFICATE,
  enrollment,
  failure,
  levelDetail,
  missionDetail,
  ok,
  projectDetail,
  tree,
} from "@/test/learning-fixtures";

const GET = vi.fn();
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("@/lib/runtime-config", () => ({ publicApiUrl: () => "https://api.steamy.test" }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("./LessonVideo", () => ({
  LessonVideo: ({ title, missionId }: { title: string; missionId?: number }) => (
    <p data-testid="video">
      {title} {missionId}
    </p>
  ),
}));

const { CourseTree, CourseTreeSkeleton } = await import("./CourseTree");
const { ProjectView } = await import("./ProjectView");
const { LevelView } = await import("./LevelView");
const { MissionView } = await import("./MissionView");
const { MyCourses, MyCoursesSkeleton } = await import("./MyCourses");
const { ContentSkeleton } = await import("./ContentSkeleton");

beforeEach(() => GET.mockReset());

describe("CourseTree (WC06a/WC06b)", () => {
  it("projets repliés : en-tête, comptes, verrouillé non activable", async () => {
    GET.mockResolvedValue(ok(tree()));
    render((await CourseTree({ slug: "robot-bluetooth", expandedProjectId: null })) as ReactElement);
    expect(GET).toHaveBeenCalledWith("/api/learning/enrollments/{course_slug}/tree/", {
      params: { path: { course_slug: "robot-bluetooth" } },
    });
    expect(screen.getByRole("heading", { level: 2, name: "Construis ton robot Bluetooth" })).toBeInTheDocument();
    expect(screen.getByText(/Projet 2 sur 3/)).toBeInTheDocument();
    expect(screen.getByText("· 2 h restant")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Continuer la mission/ })).toHaveAttribute(
      "href",
      "/apprenant/parcours/robot-bluetooth/missions/12",
    );
    expect(screen.getByRole("heading", { name: "Ton parcours · 3 projets" })).toBeInTheDocument();
    expect(screen.getByText("1 terminé · 1 en cours · 1 verrouillé")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Capteurs & moteurs/ })).toHaveAttribute(
      "href",
      "/apprenant/parcours/robot-bluetooth?projet=2",
    );
    expect(screen.queryByRole("link", { name: /Connexion Bluetooth/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Mission 12")).not.toBeInTheDocument();
  });

  it("projet déplié : niveaux, missions, quiz ; la prochaine mission est « en cours »", async () => {
    GET.mockResolvedValue(ok(tree()));
    render((await CourseTree({ slug: "robot-bluetooth", expandedProjectId: 2 })) as ReactElement);
    const head = screen.getByRole("link", { name: /Capteurs & moteurs/ });
    expect(head).toHaveAccessibleName(/masquer les étapes/);
    expect(head).not.toHaveAttribute("aria-expanded");
    expect(head).toHaveAttribute("href", "/apprenant/parcours/robot-bluetooth");
    const panel = document.getElementById("projet-2-etapes") as HTMLElement;
    expect(within(panel).getByRole("link", { name: /Mission 12/ })).toHaveAttribute("aria-current", "step");
    expect(within(panel).queryByRole("link", { name: /Mission 13/ })).not.toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "Niveau 1 · Servo" })).toHaveAttribute(
      "href",
      "/apprenant/parcours/robot-bluetooth/niveaux/21",
    );
    expect(within(panel).getByText("Niveau 2 · Capteurs avancés")).toBeInTheDocument();
    expect(within(panel).queryByRole("link", { name: "Niveau 2 · Capteurs avancés" })).not.toBeInTheDocument();
    expect(within(panel).getByText("Quiz servo")).toBeInTheDocument();
    expect(within(panel).getByText("Bilan du projet 2")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "Voir le projet 2 ›" })).toHaveAttribute(
      "href",
      "/apprenant/parcours/robot-bluetooth/projets/2",
    );
  });

  it("un projet terminé se déplie aussi ; un projet verrouillé jamais", async () => {
    const data = tree({ next: { ...tree().next, type: "quiz", id: 101 } });
    data.projects[0].levels[0].quiz!.state = "available";
    GET.mockResolvedValue(ok(data));
    const { unmount } = render((await CourseTree({ slug: "robot-bluetooth", expandedProjectId: 1 })) as ReactElement);
    expect(screen.getByRole("link", { name: /Quiz circuits/ })).toHaveAttribute("aria-current", "step");
    unmount();
    GET.mockResolvedValue(ok(tree({ currentProject: null, projects: tree().projects.slice(1) })));
    render((await CourseTree({ slug: "robot-bluetooth", expandedProjectId: 3 })) as ReactElement);
    expect(document.getElementById("projet-3-etapes")).toBeNull();
    expect(screen.queryByText(/sur 2/)).not.toBeInTheDocument();
    expect(screen.getByText("0 terminé · 1 en cours · 1 verrouillé")).toBeInTheDocument();
  });

  it("parcours fini : plus de temps restant", async () => {
    const done = tree();
    for (const project of done.projects) for (const level of project.levels) for (const m of level.missions) m.state = "done";
    GET.mockResolvedValue(ok({ ...done, next: { ...done.next, type: "certification", id: null } }));
    render((await CourseTree({ slug: "robot-bluetooth", expandedProjectId: null })) as ReactElement);
    expect(screen.queryByText(/restant/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Voir ma certification/ })).toBeInTheDocument();
  });

  it("pas inscrit → état verrouillé vers la fiche du parcours", async () => {
    GET.mockResolvedValue(failure(403, "NOT_ENROLLED"));
    render((await CourseTree({ slug: "robot-bluetooth", expandedProjectId: null })) as ReactElement);
    expect(screen.getByRole("heading", { name: "Ce contenu n'est pas encore ouvert" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Voir le parcours/ })).toHaveAttribute(
      "href",
      "/apprenant/catalogue/robot-bluetooth",
    );
  });

  it("squelettes annoncés", () => {
    render(
      <>
        <CourseTreeSkeleton />
        <ContentSkeleton />
        <MyCoursesSkeleton />
      </>,
    );
    expect(screen.getAllByRole("status")).toHaveLength(3);
  });
});

/** Contenu lu par la vue, et arbre du parcours (`next`) qui désigne l'étape en cours. */
function withTree(content: unknown, next?: Partial<ReturnType<typeof tree>["next"]>) {
  GET.mockImplementation(async (path: string) =>
    path === "/api/learning/enrollments/{course_slug}/tree/"
      ? next
        ? ok(tree({ next: { ...tree().next, ...next } }))
        : failure(500)
      : content,
  );
}

describe("ProjectView (WJ01)", () => {
  it("objectifs, niveaux, progression, reprise du niveau en cours (`next` de l'API), récompenses", async () => {
    withTree(ok(projectDetail()), { type: "mission", id: 30, projectId: 2, levelId: 22 });
    render((await ProjectView({ slug: "robot-bluetooth", projectId: 2 })) as ReactElement);
    expect(GET).toHaveBeenCalledWith("/api/learning/projects/{id}/", { params: { path: { id: 2 } } });
    expect(screen.getByRole("heading", { level: 2, name: "Capteurs & moteurs" })).toBeInTheDocument();
    expect(screen.getByText("Calibrer un servo")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Matériel/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Niveau 2.*Capteurs/ })).toHaveAttribute("aria-current", "step");
    expect(screen.queryByRole("link", { name: /Niveau 3/ })).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("2 missions terminées sur 4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Continuer le niveau 2/ })).toHaveAttribute(
      "href",
      "/apprenant/parcours/robot-bluetooth/niveaux/22",
    );
    expect(screen.getByText(/Badge du niveau 1/)).toHaveTextContent("(obtenu)");
    expect(screen.getByText(/Badge du projet/)).not.toHaveTextContent("(obtenu)");
  });

  it("projet terminé, sans mission ni niveau ouvert", async () => {
    withTree(ok(projectDetail({ state: "done", missionCount: 0, missionsDone: 1, levels: [projectDetail().levels[0]] })));
    render((await ProjectView({ slug: "robot-bluetooth", projectId: 2 })) as ReactElement);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("1 mission terminée sur 0")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Continuer le niveau/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Badge du projet/)).toHaveTextContent("(obtenu)");
  });

  it("verrouillé → LockedContentState vers l'arbre", async () => {
    GET.mockResolvedValue(failure(403, "CONTENT_LOCKED"));
    render((await ProjectView({ slug: "robot-bluetooth", projectId: 3 })) as ReactElement);
    expect(screen.getByRole("link", { name: /Voir mon parcours/ })).toHaveAttribute(
      "href",
      "/apprenant/parcours/robot-bluetooth",
    );
  });
});

describe("LevelView (WJ02)", () => {
  it("vidéo d'intro, résumé, missions, commencer la 1re mission", async () => {
    withTree(ok(levelDetail()), { type: "mission", id: 12, levelId: 21 });
    render((await LevelView({ slug: "robot-bluetooth", levelId: 21 })) as ReactElement);
    expect(screen.getByTestId("video")).toHaveTextContent("Introduction : Brancher les moteurs");
    expect(screen.getByText("Tu vas brancher deux moteurs.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Commencer la 1ʳᵉ mission" })).toHaveAttribute(
      "href",
      "/apprenant/parcours/robot-bluetooth/missions/12",
    );
    expect(screen.getByRole("link", { name: "Projet 2" })).toHaveAttribute("href", "/apprenant/parcours/robot-bluetooth/projets/2");
  });

  it("niveau entamé : continuer ; niveau fini : retour au parcours ; sans vidéo ni résumé", async () => {
    const missions = levelDetail().missions;
    withTree(
      ok(levelDetail({ introVimeoId: null, introSummary: "", missions: [{ ...missions[0], state: "done" }, { ...missions[1], state: "available" }] })),
      { type: "mission", id: 13, levelId: 21 },
    );
    const { unmount } = render((await LevelView({ slug: "robot-bluetooth", levelId: 21 })) as ReactElement);
    expect(screen.queryByTestId("video")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continuer la mission 2" })).toBeInTheDocument();
    unmount();
    withTree(ok(levelDetail({ missions: missions.map((m) => ({ ...m, state: "done" as const })) })), { type: "quiz", id: 201, levelId: 21 });
    render((await LevelView({ slug: "robot-bluetooth", levelId: 21 })) as ReactElement);
    expect(screen.getByRole("link", { name: /Retour à mon parcours/ })).toHaveAttribute(
      "href",
      "/apprenant/parcours/robot-bluetooth",
    );
  });

  it("verrouillé", async () => {
    GET.mockResolvedValue(failure(403, "CONTENT_LOCKED"));
    render((await LevelView({ slug: "robot-bluetooth", levelId: 22 })) as ReactElement);
    expect(screen.getByRole("heading", { name: "Ce contenu n'est pas encore ouvert" })).toBeInTheDocument();
  });
});

describe("MissionView (WJ03)", () => {
  it("vidéo suivie, blocs, retour au niveau et « Marquer comme terminée »", async () => {
    GET.mockResolvedValue(ok(missionDetail()));
    render((await MissionView({ slug: "robot-bluetooth", missionId: 12 })) as ReactElement);
    expect(screen.getByTestId("video")).toHaveTextContent("Identifier les moteurs 12");
    expect(screen.getByText("Repère les bornes.")).toBeInTheDocument();
    expect(screen.getByText("Un petit + est gravé.")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Un moteur" })).toHaveAttribute("src", "https://cdn.test/moteur.png");
    expect(screen.getByRole("link", { name: /Retour au niveau/ })).toHaveAttribute(
      "href",
      "/apprenant/parcours/robot-bluetooth/niveaux/21",
    );
    expect(screen.getByRole("button", { name: /Marquer comme terminée/ })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Fil d'Ariane" })).toHaveTextContent("Mission 1");
  });

  it("mission déjà faite : étape suivante de l'API ; sans vidéo ni icône", async () => {
    GET.mockResolvedValue(ok(missionDetail({ state: "done", vimeoId: null, icon: "", blocks: [] })));
    render((await MissionView({ slug: "robot-bluetooth", missionId: 12 })) as ReactElement);
    expect(screen.queryByTestId("video")).not.toBeInTheDocument();
    expect(screen.getByText("✓ Mission terminée")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Continuer la mission/ })).toHaveAttribute(
      "href",
      "/apprenant/parcours/robot-bluetooth/missions/13",
    );
    expect(screen.getByText("🤖")).toBeInTheDocument();
  });

  it("accès direct à une mission verrouillée → LockedContentState, sans contenu", async () => {
    GET.mockResolvedValue(failure(403, "CONTENT_LOCKED"));
    render((await MissionView({ slug: "robot-bluetooth", missionId: 14 })) as ReactElement);
    expect(screen.getByRole("heading", { name: "Ce contenu n'est pas encore ouvert" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Marquer/ })).not.toBeInTheDocument();
  });
});

describe("MyCourses (WD23)", () => {
  const tabs = (counts: { active: number; completed: number }) => (
    <p>
      onglets {counts.active}/{counts.completed}
    </p>
  );
  const page = <T,>(results: T[], count = results.length) => ok({ count, results });

  it("en cours : cartes triées par l'API, compteurs des onglets", async () => {
    GET.mockImplementation(async (path: string, options?: { params: { query: { status?: string } } }) => {
      if (path === "/api/learning/certificates/") return page([CERTIFICATE]);
      return options?.params.query.status === "active" ? page([enrollment(), enrollment({ id: 2 })]) : page([], 1);
    });
    render((await MyCourses({ tab: "active", children: tabs })) as ReactElement);
    expect(screen.getByText("onglets 2/1")).toBeInTheDocument();
    expect(screen.getByText("Triés par dernière activité")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Explorer le catalogue" })).toHaveAttribute("href", "/apprenant/catalogue");
  });

  it("terminés : certificat prêt téléchargeable, sinon lien vers WJ07 seulement", async () => {
    const done = enrollment({ status: "completed", progressPct: 100 });
    const other = enrollment({ id: 3, status: "completed", course: { ...done.course, slug: "autre" } });
    GET.mockImplementation(async (path: string, options?: { params: { query: { status?: string } } }) => {
      if (path === "/api/learning/certificates/") return page([CERTIFICATE]);
      return options?.params.query.status === "completed" ? page([done, other]) : page([enrollment()]);
    });
    render((await MyCourses({ tab: "completed", children: tabs })) as ReactElement);
    expect(screen.getAllByRole("link", { name: /Télécharger la certification/ })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Voir ma certification ›" })).toHaveLength(2);
    expect(screen.getByText(/Un parcours passe dans « Terminés »/)).toBeInTheDocument();
    expect(screen.queryByText("Triés par dernière activité")).not.toBeInTheDocument();
  });

  it("onglet vide alors que l'autre ne l'est pas", async () => {
    GET.mockImplementation(async (path: string, options?: { params: { query: { status?: string } } }) => {
      if (path === "/api/learning/certificates/") return ok({ count: 0 });
      return options?.params.query.status === "active" ? page([enrollment()]) : page([]);
    });
    const { unmount } = render((await MyCourses({ tab: "completed", children: tabs })) as ReactElement);
    expect(screen.getByText(/Aucun parcours terminé pour l'instant/)).toBeInTheDocument();
    unmount();
    GET.mockImplementation(async (path: string, options?: { params: { query: { status?: string } } }) => {
      if (path === "/api/learning/certificates/") return failure(500);
      return options?.params.query.status === "completed" ? page([enrollment({ status: "completed" })]) : ok({});
    });
    render((await MyCourses({ tab: "active", children: tabs })) as ReactElement);
    expect(screen.getByText(/Aucun parcours en cours/)).toBeInTheDocument();
  });

  it("aucun parcours : invitation au catalogue gratuit (D27)", async () => {
    GET.mockImplementation(async (path: string) =>
      path === "/api/learning/certificates/" ? page([]) : page([]),
    );
    render((await MyCourses({ tab: "active", children: tabs })) as ReactElement);
    expect(screen.getByRole("heading", { name: "Tu n'as pas encore de parcours" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Commence par un parcours gratuit/ })).toHaveAttribute(
      "href",
      "/apprenant/catalogue?prix=gratuit",
    );
  });

  it("inscriptions illisibles → erreur du segment", async () => {
    GET.mockResolvedValue(failure(500));
    await expect(MyCourses({ tab: "active", children: tabs })).rejects.toThrow("Inscriptions illisibles");
  });
});
