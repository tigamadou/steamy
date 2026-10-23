import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";
import { missionRead, supervisedCourse, supervisedCourseDetail } from "@/test/teacher-fixtures";

const GET = vi.fn();
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/features/learning/LessonVideo", () => ({
  LessonVideo: (props: { vimeoId: string; missionId?: number }) => (
    <div data-testid="video" data-vimeo={props.vimeoId} data-tracked={String(props.missionId !== undefined)} />
  ),
}));

const { COURSES_PAGE_SIZE, getSupervisedCourse, getSupervisedCourses, getSupervisedMission } = await import("./api");
const { SupervisedCourseCard, supervisionLabel } = await import("./SupervisedCourseCard");
const { NoSupervisedCourse, TeacherCourses, TeacherCoursesSkeleton, TeacherCoursesView } = await import(
  "./TeacherCourses"
);
const { MissionCompletionItem, completionLabel } = await import("./MissionCompletionItem");
const { CourseInsights, rateLabel, weakestSteps } = await import("./CourseInsights");
const { TeacherCourseDetail, TeacherCourseDetailSkeleton, TeacherCourseDetailView } = await import(
  "./TeacherCourseDetail"
);
const { TeacherMission, TeacherMissionSkeleton, TeacherMissionView, missionBlocks } = await import("./TeacherMission");

const respond = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });

describe("lectures de l'API", () => {
  beforeEach(() => GET.mockReset());

  it("parcours encadrés : une page lue dans l'API", async () => {
    GET.mockResolvedValue(respond(200, { count: 1, results: [supervisedCourse()] }));
    expect(await getSupervisedCourses()).toEqual([supervisedCourse()]);
    expect(GET).toHaveBeenCalledWith("/api/classrooms/courses/", { params: { query: { pageSize: COURSES_PAGE_SIZE } } });
  });

  it("parcours encadrés : liste vide si l'API ne renvoie pas de résultats, null sans session", async () => {
    GET.mockResolvedValue(respond(200, {}));
    expect(await getSupervisedCourses()).toEqual([]);
    GET.mockResolvedValue(respond(401));
    expect(await getSupervisedCourses()).toBeNull();
  });

  it("parcours : lu par son slug ; non encadré → introuvable ; sans session → null", async () => {
    GET.mockResolvedValue(respond(200, supervisedCourseDetail()));
    expect((await getSupervisedCourse("robot-bluetooth"))?.title).toBe("Robot Bluetooth");
    expect(GET).toHaveBeenCalledWith("/api/classrooms/courses/{slug}/", { params: { path: { slug: "robot-bluetooth" } } });
    GET.mockResolvedValue(respond(404));
    await expect(getSupervisedCourse("autre")).rejects.toThrow("NEXT_NOT_FOUND");
    GET.mockResolvedValue(respond(401));
    expect(await getSupervisedCourse("robot-bluetooth")).toBeNull();
  });

  it("mission : identifiant numérique, 404 → introuvable, sans session → null", async () => {
    await expect(getSupervisedMission("robot-bluetooth", "abc")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(GET).not.toHaveBeenCalled();
    GET.mockResolvedValue(respond(200, missionRead()));
    expect((await getSupervisedMission("robot-bluetooth", "101"))?.id).toBe(101);
    expect(GET).toHaveBeenCalledWith("/api/classrooms/courses/{slug}/missions/{id}/", {
      params: { path: { slug: "robot-bluetooth", id: 101 } },
    });
    GET.mockResolvedValue(respond(404));
    await expect(getSupervisedMission("robot-bluetooth", "999")).rejects.toThrow("NEXT_NOT_FOUND");
    GET.mockResolvedValue(respond(403));
    expect(await getSupervisedMission("robot-bluetooth", "101")).toBeNull();
  });
});

describe("WT02 · parcours encadrés", () => {
  it("effectifs au singulier et au pluriel", () => {
    expect(supervisionLabel({ classroomCount: 1, learnerCount: 1 })).toBe("1 classe · 1 élève");
    expect(supervisionLabel({ classroomCount: 2, learnerCount: 15 })).toBe("2 classes · 15 élèves");
  });

  it("carte : toute la carte mène à WT10, classes et élèves de l'API", async () => {
    const { container } = render(<SupervisedCourseCard course={supervisedCourse()} />);
    expect(screen.getByRole("link", { name: "Robot Bluetooth" })).toHaveAttribute(
      "href",
      "/enseignant/parcours/robot-bluetooth",
    );
    expect(screen.getByText("2 classes · 15 élèves")).toBeInTheDocument();
    expect(screen.getByText("Débutant")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("liste des parcours, puis état vide avec « Créer une classe »", async () => {
    const { container, unmount } = render(
      <TeacherCoursesView courses={[supervisedCourse(), supervisedCourse({ slug: "scratch", title: "Scratch" })]} />,
    );
    expect(within(screen.getByRole("list", { name: "Mes parcours encadrés" })).getAllByRole("listitem")).toHaveLength(2);
    expect(await axe(container)).toHaveNoViolations();
    unmount();
    render(<TeacherCoursesView courses={[]} />);
    expect(screen.getByRole("link", { name: "Créer une classe" })).toHaveAttribute("href", "/enseignant/classes/nouvelle");
  });

  it("serveur : lit les parcours ; sans session ne rend rien", async () => {
    GET.mockResolvedValue(respond(200, { results: [supervisedCourse()] }));
    render(await TeacherCourses());
    expect(screen.getByRole("link", { name: "Robot Bluetooth" })).toBeInTheDocument();
    GET.mockResolvedValue(respond(401));
    expect(await TeacherCourses()).toBeNull();
  });

  it("état vide et squelette accessibles, au vouvoiement", async () => {
    const { container } = render(
      <>
        <NoSupervisedCourse />
        <TeacherCoursesSkeleton />
      </>,
    );
    expect(screen.getByText(/Vous n'encadrez aucun parcours/)).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Chargement de vos parcours…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("WT10 · détail d'un parcours encadré", () => {
  it("libellés des compteurs de mission", () => {
    expect(completionLabel(0)).toBe("Aucun élève ne l'a terminée");
    expect(completionLabel(1)).toBe("1 élève l'a terminée");
    expect(completionLabel(12)).toBe("12 élèves l'ont terminée");
  });

  it("mission : compteur d'élèves ayant terminé, durée distincte, lien en lecture seule", async () => {
    const { container } = render(
      <MissionCompletionItem step="Mission 1" title="Allumer une LED" durationMin={75} completedCount={12} href="/m" />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/m");
    expect(link).toHaveTextContent("⏱ 1 h 15");
    expect(link).toHaveTextContent("12 élèves l'ont terminée");
    expect(link).toHaveTextContent("🤖");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("arbre Projet → Niveau → Mission avec les compteurs de l'API", async () => {
    const { container } = render(<TeacherCourseDetailView course={supervisedCourseDetail()} />);
    expect(screen.getByRole("navigation", { name: "Fil d'Ariane" })).toHaveTextContent("Mes parcours›Robot Bluetooth");
    expect(screen.getByRole("heading", { level: 2, name: "Robot Bluetooth" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Projet 1 · Robot suiveur" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: /Niveau 1 · Les moteurs/ })).toHaveTextContent("1 h 30");
    expect(screen.getByRole("heading", { level: 4, name: /^Niveau 2 · Les capteurs/ })).toBeInTheDocument();
    const missions = screen.getAllByRole("link", { name: /Mission \d/ });
    expect(missions).toHaveLength(3);
    expect(missions[0]).toHaveAttribute("href", "/enseignant/parcours/robot-bluetooth/missions/101");
    expect(missions[0]).toHaveTextContent("12 élèves l'ont terminée");
    expect(missions[2]).toHaveTextContent("Aucun élève ne l'a terminée");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sans description", () => {
    render(<TeacherCourseDetailView course={supervisedCourseDetail({ description: "" })} />);
    expect(screen.queryByText("Un robot piloté par téléphone.")).toBeNull();
  });

  it("niveau sans durée", () => {
    const course = supervisedCourseDetail();
    delete course.projects[0].levels[0].durationMin;
    render(<TeacherCourseDetailView course={course} />);
    expect(screen.getByRole("heading", { level: 4, name: "Niveau 1 · Les moteurs" })).toBeInTheDocument();
  });

  it("mission sans durée", () => {
    const course = supervisedCourseDetail();
    delete course.projects[0].levels[0].missions[0].durationMin;
    render(<TeacherCourseDetailView course={course} />);
    expect(screen.getAllByText(/⏱ 0 min/)).toHaveLength(1);
  });

  it("panneau : progression par classe, taux de réussite et plus échoués (ordre croissant)", async () => {
    const { container } = render(<CourseInsights course={supervisedCourseDetail()} />);
    const progress = screen.getByRole("region", { name: "Progression par classe" });
    expect(within(progress).getByRole("progressbar", { name: "Progression : 4ᵉ B · Robotique" })).toHaveAttribute(
      "aria-valuenow",
      "42",
    );
    expect(within(progress).getByRole("link", { name: "3ᵉ A" })).toHaveAttribute("href", "/enseignant/classes/4");
    const rates = screen.getByRole("region", { name: "Taux de réussite" });
    expect(within(rates).getAllByRole("definition").map((dd) => dd.textContent)).toEqual(["75 %", "Aucune tentative"]);
    const weak = within(screen.getByRole("region", { name: "Les plus échoués" })).getAllByRole("listitem");
    expect(weak.map((li) => li.textContent)).toEqual([
      "Niveau · Les moteurs25 % de réussite",
      "Projet · Robot suiveur50 % de réussite",
    ]);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sans échec, rien n'est signalé", () => {
    const course = supervisedCourseDetail({ projects: [] });
    render(<CourseInsights course={course} />);
    expect(screen.getByText(/Aucun niveau ni projet en difficulté/)).toBeInTheDocument();
  });

  it("taux et limite des plus échoués", () => {
    expect(rateLabel(null)).toBe("Aucune tentative");
    expect(rateLabel(0)).toBe("0 %");
    const many = supervisedCourseDetail().projects.concat([
      { id: 3, title: "P3", passRate: 10, levels: [] },
      { id: 4, title: "P4", passRate: 20, levels: [] },
    ] as never);
    expect(weakestSteps(many).map((step) => step.label)).toEqual(["P3", "P4", "Les moteurs"]);
    expect(weakestSteps(many, 1)).toHaveLength(1);
  });

  it("serveur : lit le parcours ; sans session ne rend rien ; introuvable → 404", async () => {
    GET.mockReset();
    GET.mockResolvedValue(respond(200, supervisedCourseDetail()));
    render(await TeacherCourseDetail({ params: Promise.resolve({ slug: "robot-bluetooth" }) }));
    expect(screen.getByRole("heading", { level: 2, name: "Robot Bluetooth" })).toBeInTheDocument();
    GET.mockResolvedValue(respond(401));
    expect(await TeacherCourseDetail({ params: Promise.resolve({ slug: "robot-bluetooth" }) })).toBeNull();
    GET.mockResolvedValue(respond(404));
    await expect(TeacherCourseDetail({ params: Promise.resolve({ slug: "x" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("squelette accessible", async () => {
    const { container } = render(<TeacherCourseDetailSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement du parcours…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("mission en lecture seule", () => {
  it("blocs : liste vide si le contenu n'est pas une liste", () => {
    expect(missionBlocks(null)).toEqual([]);
    expect(missionBlocks([{ type: "text", text: "a" }])).toHaveLength(1);
  });

  it("contenu de l'apprenant sans progression, sans quiz et sans suivi du visionnage", async () => {
    const { container } = render(
      <TeacherMissionView
        slug="robot-bluetooth"
        courseTitle="Robot Bluetooth"
        mission={missionRead({ vimeoId: "123", vimeoHash: "abc" })}
      />,
    );
    expect(screen.getByRole("navigation", { name: "Fil d'Ariane" })).toHaveTextContent(
      "Mes parcours›Robot Bluetooth›Mission 1",
    );
    expect(screen.getByRole("heading", { level: 2, name: "Allumer une LED" })).toBeInTheDocument();
    expect(screen.getByText("Branchez la LED sur la broche 13.")).toBeInTheDocument();
    expect(screen.getByTestId("video")).toHaveAttribute("data-tracked", "false");
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("link", { name: "Retour au parcours" })).toHaveAttribute(
      "href",
      "/enseignant/parcours/robot-bluetooth",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sans vidéo ni icône", () => {
    render(<TeacherMissionView slug="s" courseTitle="C" mission={missionRead({ icon: "" })} />);
    expect(screen.queryByTestId("video")).toBeNull();
    expect(screen.getByText("🤖")).toBeInTheDocument();
  });

  it("serveur : parcours et mission lus ensemble ; sans session ne rend rien", async () => {
    GET.mockReset();
    GET.mockImplementation(async (path: string) =>
      path.includes("missions") ? respond(200, missionRead()) : respond(200, supervisedCourseDetail()),
    );
    render(await TeacherMission({ params: Promise.resolve({ slug: "robot-bluetooth", id: "101" }) }));
    expect(screen.getByRole("heading", { level: 2, name: "Allumer une LED" })).toBeInTheDocument();
    GET.mockResolvedValue(respond(401));
    expect(await TeacherMission({ params: Promise.resolve({ slug: "robot-bluetooth", id: "101" }) })).toBeNull();
  });

  it("squelette accessible", async () => {
    const { container } = render(<TeacherMissionSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de la mission…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
