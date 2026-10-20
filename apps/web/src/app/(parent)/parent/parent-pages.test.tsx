import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { AppShellSkeleton } from "@/components/ds/AppShell";
import { Notifications, NotificationsSkeleton } from "@/features/notifications/Notifications";
import { ParentHome, ParentHomeSkeleton } from "@/features/parent/home/ParentHome";
import { PaymentRequestScreen, PaymentRequestSkeleton } from "@/features/parent/payment-request/PaymentRequestScreen";
import { ParentSettings, ParentSettingsSkeleton } from "@/features/parent/settings/ParentSettings";
import { ParentShell } from "@/features/parent/shell/ParentShell";
import { axe } from "@/test/axe";

const back = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ back }) }));
vi.mock("@/features/parent/shell/ParentShell", () => ({ ParentShell: () => null }));
vi.mock("@/features/parent/home/ParentHome", () => ({ ParentHome: () => null, ParentHomeSkeleton: () => null }));
vi.mock("@/features/parent/payment-request/PaymentRequestScreen", () => ({
  PaymentRequestScreen: () => null,
  PaymentRequestSkeleton: () => null,
}));
vi.mock("@/features/parent/settings/ParentSettings", () => ({
  ParentSettings: () => null,
  ParentSettingsSkeleton: () => null,
}));
vi.mock("@/features/notifications/Notifications", () => ({
  Notifications: () => null,
  NotificationsSkeleton: () => null,
}));

const { default: Layout } = await import("./layout");
const { default: HomePage } = await import("./page");
const { default: ParentLoading } = await import("./loading");
const { default: ParentError } = await import("./error");
const { default: ParentNotFound } = await import("./not-found");
const { default: NotificationsPage } = await import("./notifications/page");
const { default: PaymentRequestPage } = await import("./demandes/[id]/page");
const { default: PaymentRequestNotFound } = await import("./demandes/[id]/not-found");
const { default: SettingsPage } = await import("./parametres/page");
const { default: HelpPage } = await import("./aide/page");

type Boundary = ReactElement<{
  fallback: ReactElement<{ label?: string; space?: string; navCount?: number }>;
  children: ReactElement<{ children?: unknown; space?: string; searchParams?: unknown }>;
}>;

describe("layout du shell parent", () => {
  it("rend le shell sous Suspense, avec son squelette au vouvoiement", () => {
    const tree = Layout({ children: "page" } as never) as Boundary;
    expect(tree.props.fallback.type).toBe(AppShellSkeleton);
    expect(tree.props.fallback.props).toMatchObject({ label: "Chargement de votre espace…", navCount: 6 });
    expect(tree.props.children.type).toBe(ParentShell);
    expect(tree.props.children.props.children).toBe("page");
  });
});

describe("pages de l'espace parent", () => {
  it("WPD01 : accueil sous Suspense, avec son squelette", () => {
    const tree = HomePage() as Boundary;
    expect(tree.props.fallback.type).toBe(ParentHomeSkeleton);
    expect(tree.props.children.type).toBe(ParentHome);
  });

  it("WPD14 : notifications de l'espace parent", () => {
    const searchParams = Promise.resolve({});
    const tree = NotificationsPage({ searchParams } as never) as Boundary;
    expect(tree.props.fallback.type).toBe(NotificationsSkeleton);
    expect(tree.props.fallback.props.space).toBe("parent");
    expect(tree.props.children.type).toBe(Notifications);
    expect(tree.props.children.props).toMatchObject({ space: "parent", searchParams });
  });
});

describe("WPD15", () => {
  it("demande de paiement sous Suspense, avec son squelette", () => {
    const params = Promise.resolve({ id: "12" });
    const tree = PaymentRequestPage({ params } as never) as Boundary;
    expect(tree.props.fallback.type).toBe(PaymentRequestSkeleton);
    expect(tree.props.children.type).toBe(PaymentRequestScreen);
    expect(tree.props.children.props).toMatchObject({ params });
  });

  it("« Demande introuvable » sans distinguer « interdit »", () => {
    render(<PaymentRequestNotFound />);
    expect(screen.getByRole("heading", { level: 2, name: "Demande introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir mes demandes à valider" })).toHaveAttribute("href", "/parent");
  });
});

describe("WPD08 et WPD13", () => {
  it("WPD08 : paramètres sous Suspense, avec leur squelette", () => {
    const tree = SettingsPage() as Boundary;
    expect(tree.props.fallback.type).toBe(ParentSettingsSkeleton);
    expect(tree.props.children.type).toBe(ParentSettings);
  });

  it("WPD13 : FAQ du parent avec recherche locale et « Contacter le support » vers WL24", async () => {
    const user = userEvent.setup();
    const { container } = render(<HelpPage />);
    expect(screen.getByRole("heading", { level: 2, name: "Questions fréquentes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contacter le support" })).toHaveAttribute("href", "/aide#contact");
    expect(await axe(container)).toHaveNoViolations();
    await user.type(screen.getByRole("searchbox", { name: "Rechercher une question" }), "zzzz");
    expect(screen.getByText(/Aucune question ne correspond/)).toBeInTheDocument();
  });
});

describe("états de l'espace parent", () => {
  it("chargement au vouvoiement", () => {
    render(<ParentLoading />);
    expect(screen.getByRole("status")).toHaveTextContent(/votre|vous/i);
  });

  it("erreur : réessayer ou revenir, sous le h1 du shell", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(<ParentError error={new Error("boom")} retry={retry} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(retry).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Retour/ }));
    expect(back).toHaveBeenCalled();
  });

  it("introuvable : h2 et retour à l'accueil du parent", () => {
    render(<ParentNotFound />);
    expect(screen.getByRole("heading", { level: 2, name: "Cette page est introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/parent");
  });
});
