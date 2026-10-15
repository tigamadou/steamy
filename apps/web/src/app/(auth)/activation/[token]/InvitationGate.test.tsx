import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

const { InvitationGate } = await import("./InvitationGate");
const { ActivationForm } = await import("./ActivationForm");
const { InvalidInvitation } = await import("../InvalidInvitation");
const { default: ActivationPage, metadata } = await import("./page");

const params = { params: Promise.resolve({ token: "jeton-invitation" }) };
const invitation = { firstName: "Awa", schoolName: "CEG Akpakpa", emailMasked: "a•••@ecole.bj" };

describe("InvitationGate", () => {
  beforeEach(() => GET.mockReset());

  it("affiche le formulaire d'activation d'une invitation valable", async () => {
    GET.mockResolvedValue({ data: invitation });
    const tree = await InvitationGate(params);
    expect(GET).toHaveBeenCalledWith("/api/auth/teacher-invitations/{token}/", {
      params: { path: { token: "jeton-invitation" } },
    });
    expect(tree.type).toBe(ActivationForm);
    expect(tree.props).toEqual({ token: "jeton-invitation", invitation });
  });

  it.each(["INVITATION_INVALID", "NOT_FOUND"])("affiche le lien expiré sur %s", async (code) => {
    GET.mockResolvedValue({ error: { code, message: "" } });
    expect((await InvitationGate(params)).type).toBe(InvalidInvitation);
  });

  it("laisse remonter une autre erreur", async () => {
    GET.mockResolvedValue({ error: { code: "SERVER_ERROR", message: "" } });
    await expect(InvitationGate(params)).rejects.toThrow("Invitation illisible (SERVER_ERROR)");
  });
});

describe("Page d'activation", () => {
  it("lit l'invitation sous Suspense avec un message d'attente", () => {
    expect(metadata.title).toBe("Activation du compte · Steamy");
    const tree = ActivationPage(params as PageProps<"/activation/[token]">);
    expect(tree.props.children.type).toBe(InvitationGate);
    expect(tree.props.children.props).toEqual(params);
    render(tree.props.fallback);
    expect(screen.getByRole("status")).toHaveTextContent("Vérification de votre invitation…");
  });
});
