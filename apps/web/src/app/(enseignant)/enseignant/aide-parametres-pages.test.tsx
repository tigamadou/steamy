import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { Notifications, NotificationsSkeleton } from "@/features/notifications/Notifications";
import { TeacherSettings, TeacherSettingsSkeleton } from "@/features/teacher/settings/TeacherSettings";
import { axe } from "@/test/axe";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/notifications/Notifications", () => ({ Notifications: () => null, NotificationsSkeleton: () => null }));
vi.mock("@/features/teacher/settings/TeacherSettings", () => ({
  TeacherSettings: () => null,
  TeacherSettingsSkeleton: () => null,
}));
vi.mock("@/components/public/ContactForm", () => ({ ContactForm: () => <p>Formulaire de contact</p> }));

const { default: NotificationsPage, metadata: notificationsMetadata } = await import("./notifications/page");
const { default: SettingsPage, metadata: settingsMetadata } = await import("./parametres/page");
const { default: HelpPage, metadata: helpMetadata } = await import("./aide/page");

type Boundary = ReactElement<{ fallback: ReactElement<{ space?: string }>; children: ReactElement<{ space?: string; searchParams?: unknown }> }>;

describe("WT12 · notifications", () => {
  it("espace enseignant sous Suspense, onglet lu dans l'URL", () => {
    const searchParams = Promise.resolve({ onglet: "non-lues" });
    const tree = NotificationsPage({ searchParams } as never) as Boundary;
    expect(notificationsMetadata.title).toBe("Notifications");
    expect(tree.props.fallback.type).toBe(NotificationsSkeleton);
    expect(tree.props.fallback.props.space).toBe("teacher");
    expect(tree.props.children.type).toBe(Notifications);
    expect(tree.props.children.props.space).toBe("teacher");
    expect(tree.props.children.props.searchParams).toBe(searchParams);
  });
});

describe("WT08 · paramètres", () => {
  it("sous Suspense, avec son squelette", () => {
    const tree = SettingsPage() as Boundary;
    expect(settingsMetadata.title).toBe("Paramètres");
    expect(tree.props.fallback.type).toBe(TeacherSettingsSkeleton);
    expect(tree.props.children.type).toBe(TeacherSettings);
  });
});

describe("WT11 · aide", () => {
  it("FAQ des quatre sujets, recherche locale, formulaire de contact dans le shell", async () => {
    const user = userEvent.setup();
    const { container } = render(<HelpPage />);
    expect(helpMetadata.title).toBe("Aide & support");
    expect(screen.getByRole("heading", { level: 2, name: "Questions fréquentes" })).toBeInTheDocument();
    for (const theme of ["Créer une classe", "Ajouter des élèves", "Revoir une tentative échouée", "Échanger avec un parent"]) {
      expect(screen.getByText(theme)).toBeInTheDocument();
    }
    expect(screen.getByText("Formulaire de contact")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    await user.type(screen.getByRole("searchbox", { name: "Rechercher une question" }), "zzzz");
    expect(screen.getByText(/Aucune question ne correspond/)).toBeInTheDocument();
  });

  it("registre : vouvoiement, ni correction d'évaluation ni contact direct d'un parent", () => {
    render(<HelpPage />);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/(?<!\p{L})(tu|ton|ta|tes|toi|te)(?!\p{L})/iu);
    expect(text).not.toMatch(/corriger une évaluation|contacter le parent|formateur/i);
  });
});
