import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

const GET = vi.fn();
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("./ProfileForm", () => ({ ProfileForm: () => null }));

const { EditProfile, EditProfileSkeleton, ProfileBreadcrumb } = await import("./EditProfile");
const { ProfileForm } = await import("./ProfileForm");

describe("EditProfile (WD17, serveur)", () => {
  it("passe le profil lu dans l'API au formulaire", async () => {
    const profile = { birthDate: "2012-03-14" };
    GET.mockResolvedValue({ data: profile, response: new Response(null, { status: 200 }) });
    const tree = (await EditProfile()) as ReactElement<{ profile: unknown }>;
    expect(GET).toHaveBeenCalledWith("/api/accounts/me/learner-profile/");
    expect(tree.type).toBe(ProfileForm);
    expect(tree.props.profile).toBe(profile);
  });

  it("squelette annoncé et fil d'Ariane vers le hub", () => {
    render(
      <>
        <ProfileBreadcrumb current="Mot de passe" />
        <EditProfileSkeleton />
      </>,
    );
    expect(screen.getByRole("status", { name: "Chargement de ton profil…" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Profil" })).toHaveAttribute("href", "/apprenant/profil");
    expect(screen.getByText("Mot de passe")).toHaveAttribute("aria-current", "page");
  });
});
