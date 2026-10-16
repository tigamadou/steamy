import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/account/ProfileHub", () => ({ ProfileHub: () => null, ProfileHubSkeleton: () => null }));
vi.mock("@/features/account/EditProfile", () => ({ EditProfile: () => null, EditProfileSkeleton: () => null }));
vi.mock("@/features/account/PasswordForm", () => ({ PasswordForm: () => <form aria-label="Mot de passe" /> }));

const { ProfileHub, ProfileHubSkeleton } = await import("@/features/account/ProfileHub");
const hub = await import("./page");
const edit = await import("./modifier/page");
const password = await import("./mot-de-passe/page");

type Boundary = ReactElement<{ fallback: ReactElement; children: ReactElement }>;

describe("pages du profil de l'apprenant", () => {
  it("WD13 : hub sous Suspense, avec son squelette", () => {
    const tree = hub.default() as Boundary;
    expect(tree.props.fallback.type).toBe(ProfileHubSkeleton);
    expect(tree.props.children.type).toBe(ProfileHub);
    expect(hub.metadata.title).toBe("Mon profil");
  });

  it("WD17 : fil d'Ariane et titre h2, sous le h1 du shell", () => {
    render(edit.default());
    expect(screen.getByRole("link", { name: "Profil" })).toHaveAttribute("href", "/apprenant/profil");
    expect(screen.getByRole("heading", { level: 2, name: "Mes informations" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(edit.metadata.title).toBe("Modifier mon profil");
  });

  it("WD18 : fil d'Ariane, titre h2 et formulaire", () => {
    render(password.default());
    expect(screen.getByRole("heading", { level: 2, name: "Changer le mot de passe" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Mot de passe" })).toBeInTheDocument();
    expect(password.metadata.title).toBe("Changer de mot de passe");
  });
});
