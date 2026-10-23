import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  TeacherCourseDetail,
  TeacherCourseDetailSkeleton,
} from "@/features/teacher/courses/TeacherCourseDetail";
import { TeacherCourses, TeacherCoursesSkeleton } from "@/features/teacher/courses/TeacherCourses";
import { TeacherMission, TeacherMissionSkeleton } from "@/features/teacher/courses/TeacherMission";

vi.mock("@/features/teacher/courses/TeacherCourses", () => ({ TeacherCourses: () => null, TeacherCoursesSkeleton: () => null }));
vi.mock("@/features/teacher/courses/TeacherCourseDetail", () => ({
  TeacherCourseDetail: () => null,
  TeacherCourseDetailSkeleton: () => null,
}));
vi.mock("@/features/teacher/courses/TeacherMission", () => ({ TeacherMission: () => null, TeacherMissionSkeleton: () => null }));

const { default: CoursesPage, metadata: coursesMetadata } = await import("./page");
const { default: CoursePage, metadata: courseMetadata } = await import("./[slug]/page");
const { default: CourseNotFound } = await import("./[slug]/not-found");
const { default: MissionPage, metadata: missionMetadata } = await import("./[slug]/missions/[id]/page");

type Boundary = ReactElement<{ fallback: ReactElement; children: ReactElement<{ params?: unknown }> }>;

describe("pages des parcours encadrés", () => {
  it("WT02 : liste sous Suspense, avec son squelette", () => {
    const tree = CoursesPage() as Boundary;
    expect(coursesMetadata.title).toBe("Mes parcours encadrés");
    expect(tree.props.fallback.type).toBe(TeacherCoursesSkeleton);
    expect(tree.props.children.type).toBe(TeacherCourses);
  });

  it("WT10 : détail sous Suspense, paramètres transmis", () => {
    const params = Promise.resolve({ slug: "robot-bluetooth" });
    const tree = CoursePage({ params } as never) as Boundary;
    expect(courseMetadata.title).toBe("Parcours encadré");
    expect(tree.props.fallback.type).toBe(TeacherCourseDetailSkeleton);
    expect(tree.props.children.type).toBe(TeacherCourseDetail);
    expect(tree.props.children.props.params).toBe(params);
  });

  it("mission en lecture seule sous Suspense, paramètres transmis", () => {
    const params = Promise.resolve({ slug: "robot-bluetooth", id: "101" });
    const tree = MissionPage({ params } as never) as Boundary;
    expect(missionMetadata.title).toBe("Mission");
    expect(tree.props.fallback.type).toBe(TeacherMissionSkeleton);
    expect(tree.props.children.type).toBe(TeacherMission);
    expect(tree.props.children.props.params).toBe(params);
  });

  it("parcours introuvable : h2, sans distinguer « interdit », retour à WT02", () => {
    render(<CourseNotFound />);
    expect(screen.getByRole("heading", { level: 2, name: "Ce parcours est introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir mes parcours" })).toHaveAttribute("href", "/enseignant/parcours");
  });
});
