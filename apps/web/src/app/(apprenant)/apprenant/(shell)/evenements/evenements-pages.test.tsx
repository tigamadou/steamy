import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { steamyEvent } from "@/test/api-fixtures";

const getEvent = vi.fn();
vi.mock("@/features/events/EventsHome", () => ({ EventsHome: () => null, EventsHomeSkeleton: () => null }));
vi.mock("@/features/events/LearnerEventView", () => ({ LearnerEventView: () => null }));
vi.mock("@/features/events/EventApplication", () => ({
  EventApplication: () => null,
  EventApplicationSkeleton: () => null,
}));
vi.mock("@/lib/events", () => ({ getEvent: (slug: string) => getEvent(slug) }));

const { EventsHome, EventsHomeSkeleton } = await import("@/features/events/EventsHome");
const { LearnerEventView } = await import("@/features/events/LearnerEventView");
const { EventApplication, EventApplicationSkeleton } = await import("@/features/events/EventApplication");
const { EventDetailSkeleton } = await import("@/components/public/events");
const home = await import("./page");
const detail = await import("./[slug]/page");
const notFound = await import("./[slug]/not-found");
const apply = await import("./[slug]/candidature/page");

type Boundary = ReactElement<{ fallback: ReactElement<{ embedded?: boolean }>; children: ReactElement }>;
const params = Promise.resolve({ slug: "atelier-electronique" });

describe("pages Steamy Events de l'apprenant", () => {
  beforeEach(() => getEvent.mockReset());

  it("WD10 : liste sous Suspense ; toast au retour de WD11", async () => {
    const tree = (await home.default({ searchParams: Promise.resolve({}) } as never)) as ReactElement<{
      children: Boundary[];
    }>;
    const [boundary, toast] = tree.props.children;
    expect(boundary.props.fallback.type).toBe(EventsHomeSkeleton);
    expect(boundary.props.children.type).toBe(EventsHome);
    expect(toast).toBe(false);
    expect(home.metadata.title).toBe("Steamy Events");

    render(await home.default({ searchParams: Promise.resolve({ candidature: "envoyee" }) } as never));
    expect(await screen.findByText("Ta candidature est envoyée à ton parent.")).toBeInTheDocument();
  });

  it("WL23 : fiche sous Suspense, squelette sans marges de page, titre de l'événement", async () => {
    const tree = detail.default({ params } as never) as Boundary;
    expect(tree.props.fallback.type).toBe(EventDetailSkeleton);
    expect(tree.props.fallback.props.embedded).toBe(true);
    expect(tree.props.children.type).toBe(LearnerEventView);

    getEvent.mockResolvedValueOnce(steamyEvent());
    expect(await detail.generateMetadata({ params } as never)).toEqual({ title: "Atelier Électronique débutant" });
    getEvent.mockRejectedValueOnce(new Error("panne"));
    expect(await detail.generateMetadata({ params } as never)).toEqual({ title: "Événement introuvable" });
  });

  it("WL23 / WD11 : 404 dans le shell, en h2, retour vers WD10", () => {
    render(notFound.default());
    expect(screen.getByRole("heading", { level: 2, name: "Cet événement est introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir les événements" })).toHaveAttribute("href", "/apprenant/evenements");
  });

  it("WD11 : candidature sous Suspense", () => {
    const tree = apply.default({ params } as never) as Boundary;
    expect(tree.props.fallback.type).toBe(EventApplicationSkeleton);
    expect(tree.props.children.type).toBe(EventApplication);
    expect(apply.metadata.title).toBe("Candidature à un événement");
  });
});
