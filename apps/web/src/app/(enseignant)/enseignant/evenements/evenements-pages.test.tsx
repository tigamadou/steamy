import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { EventDetailSkeleton } from "@/components/public/events";
import { TeacherEventsHome, TeacherEventsHomeSkeleton } from "@/features/teacher/events/TeacherEventsHome";
import { TeacherEventView } from "@/features/teacher/events/TeacherEventView";

vi.mock("@/features/teacher/events/TeacherEventsHome", () => ({
  TeacherEventsHome: () => null,
  TeacherEventsHomeSkeleton: () => null,
}));
vi.mock("@/features/teacher/events/TeacherEventView", () => ({ TeacherEventView: () => null }));

const { default: EventsPage, metadata } = await import("./page");
const { default: EventPage } = await import("./[slug]/page");
const { default: EventNotFound } = await import("./[slug]/not-found");

type Boundary = ReactElement<{ fallback: ReactElement; children: ReactElement<{ params?: unknown }> }>;

describe("pages des événements", () => {
  it("WT09 sous Suspense", () => {
    const tree = EventsPage() as Boundary;
    expect(metadata.title).toBe("Steamy Events");
    expect(tree.props.fallback.type).toBe(TeacherEventsHomeSkeleton);
    expect(tree.props.children.type).toBe(TeacherEventsHome);
  });

  it("WL23 sous Suspense, paramètres transmis", () => {
    const params = Promise.resolve({ slug: "defi-robots" });
    const tree = EventPage({ params } as never) as Boundary;
    expect(tree.props.fallback.type).toBe(EventDetailSkeleton);
    expect(tree.props.children.type).toBe(TeacherEventView);
    expect(tree.props.children.props.params).toBe(params);
  });

  it("événement introuvable", () => {
    render(<EventNotFound />);
    expect(screen.getByRole("heading", { level: 2, name: "Cet événement est introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir les événements" })).toHaveAttribute("href", "/enseignant/evenements");
  });
});
