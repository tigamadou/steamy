import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { ClassroomFormSkeleton, EditClassroom, NewClassroom } from "@/features/teacher/classes/ClassroomFormScreen";
import { ClassroomMembers, ClassroomMembersSkeleton } from "@/features/teacher/classes/ClassroomMembers";
import { TeacherClasses, TeacherClassesSkeleton } from "@/features/teacher/classes/TeacherClasses";

vi.mock("@/features/teacher/classes/TeacherClasses", () => ({ TeacherClasses: () => null, TeacherClassesSkeleton: () => null }));
vi.mock("@/features/teacher/classes/ClassroomMembers", () => ({
  ClassroomMembers: () => null,
  ClassroomMembersSkeleton: () => null,
}));
vi.mock("@/features/teacher/classes/ClassroomFormScreen", () => ({
  NewClassroom: () => null,
  EditClassroom: () => null,
  ClassroomFormSkeleton: () => null,
}));

const { default: ClassesPage, metadata: classesMetadata } = await import("./page");
const { default: NewPage, metadata: newMetadata } = await import("./nouvelle/page");
const { default: ClassroomPage, metadata: classroomMetadata } = await import("./[id]/page");
const { default: EditPage, metadata: editMetadata } = await import("./[id]/modifier/page");
const { default: ClassroomNotFound } = await import("./[id]/not-found");

type Boundary = ReactElement<{ fallback: ReactElement; children: ReactElement<{ params?: unknown; searchParams?: unknown }> }>;

describe("pages des classes", () => {
  it("WT03 sous Suspense", () => {
    const tree = ClassesPage() as Boundary;
    expect(classesMetadata.title).toBe("Mes classes");
    expect(tree.props.fallback.type).toBe(TeacherClassesSkeleton);
    expect(tree.props.children.type).toBe(TeacherClasses);
  });

  it("WT13 création sous Suspense", () => {
    const tree = NewPage() as Boundary;
    expect(newMetadata.title).toBe("Créer une classe");
    expect(tree.props.fallback.type).toBe(ClassroomFormSkeleton);
    expect(tree.props.children.type).toBe(NewClassroom);
  });

  it("WT04 sous Suspense, paramètres transmis", () => {
    const params = Promise.resolve({ id: "3" });
    const searchParams = Promise.resolve({});
    const tree = ClassroomPage({ params, searchParams } as never) as Boundary;
    expect(classroomMetadata.title).toBe("Élèves de la classe");
    expect(tree.props.fallback.type).toBe(ClassroomMembersSkeleton);
    expect(tree.props.children.type).toBe(ClassroomMembers);
    expect(tree.props.children.props.params).toBe(params);
    expect(tree.props.children.props.searchParams).toBe(searchParams);
  });

  it("WT13 édition sous Suspense", () => {
    const params = Promise.resolve({ id: "3" });
    const tree = EditPage({ params } as never) as Boundary;
    expect(editMetadata.title).toBe("Modifier la classe");
    expect(tree.props.fallback.type).toBe(ClassroomFormSkeleton);
    expect(tree.props.children.type).toBe(EditClassroom);
    expect(tree.props.children.props.params).toBe(params);
  });

  it("classe introuvable : h2, retour à WT03", () => {
    render(<ClassroomNotFound />);
    expect(screen.getByRole("heading", { level: 2, name: "Cette classe est introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir mes classes" })).toHaveAttribute("href", "/enseignant/classes");
  });
});
