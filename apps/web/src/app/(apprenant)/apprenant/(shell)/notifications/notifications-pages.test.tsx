import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/notifications/Notifications", () => ({
  Notifications: () => null,
  NotificationsSkeleton: () => null,
}));
vi.mock("@/features/notifications/Preferences", () => ({
  Preferences: () => null,
  PreferencesSkeleton: () => null,
}));

const { default: NotificationsPage, metadata } = await import("./page");
const { default: PreferencesPage, metadata: preferencesMetadata } = await import("./preferences/page");
const { Notifications, NotificationsSkeleton } = await import("@/features/notifications/Notifications");
const { Preferences, PreferencesSkeleton } = await import("@/features/notifications/Preferences");

type Boundary = ReactElement<{ fallback: ReactElement; children: ReactElement<{ searchParams?: unknown }> }>;

describe("pages des notifications", () => {
  it("WD04 : liste sous Suspense, avec ses paramètres d'URL", () => {
    const searchParams = Promise.resolve({});
    const tree = NotificationsPage({ searchParams } as never) as Boundary;
    expect(tree.props.fallback.type).toBe(NotificationsSkeleton);
    expect(tree.props.children.type).toBe(Notifications);
    expect(tree.props.children.props.searchParams).toBe(searchParams);
    expect(metadata.title).toBe("Notifications");
  });

  it("WD06 : préférences sous Suspense", () => {
    const tree = PreferencesPage() as Boundary;
    expect(tree.props.fallback.type).toBe(PreferencesSkeleton);
    expect(tree.props.children.type).toBe(Preferences);
    expect(preferencesMetadata.title).toBe("Préférences de notification");
  });
});
