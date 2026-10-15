import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const PATCH = vi.fn();
const router = { replace: vi.fn() };
const AVATARS = [
  { id: 1, code: "chat", label: "Chat", emoji: "🐱", color: "cat-ia" },
  { id: 2, code: "robot", label: "Robot", emoji: "🤖", color: "cat-robotique" },
];
type Referential = { items?: object[]; status: string; retry?: () => void };
let avatars: Referential;
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ PATCH }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/use-referential", () => ({ useReferential: () => avatars }));

const { AvatarStep } = await import("./AvatarStep");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const finish = () => screen.getByRole("button", { name: /Terminer mon profil/ });

describe("AvatarStep (W14)", () => {
  beforeEach(() => {
    PATCH.mockReset();
    router.replace.mockReset();
    avatars = { items: AVATARS, status: "ready", retry: vi.fn() };
  });

  it("propose de recharger les avatars après un échec", async () => {
    avatars = { items: undefined, status: "error", retry: vi.fn() };
    render(<AvatarStep />);
    expect(screen.getByRole("alert")).toHaveTextContent("Impossible de charger les avatars.");
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(avatars.retry).toHaveBeenCalled();
  });

  it("montre le chargement des avatars", () => {
    avatars = { items: undefined, status: "loading" };
    render(<AvatarStep />);
    expect(screen.getByText("Chargement des avatars…")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("ne présélectionne aucun avatar et désactive le bouton", () => {
    render(<AvatarStep />);
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    screen.getAllByRole("radio").forEach((radio) => expect(radio).not.toBeChecked());
    expect(finish()).toBeDisabled();
  });

  it("enregistre l'avatar choisi puis ouvre la bienvenue", async () => {
    PATCH.mockResolvedValue(respond(200, { data: { profileStep: null } }));
    render(<AvatarStep />);
    await userEvent.click(screen.getByRole("radio", { name: "Robot" }));
    expect(finish()).toBeEnabled();
    await userEvent.click(finish());
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inscription/apprenant/bienvenue"));
    expect(PATCH).toHaveBeenCalledWith("/api/accounts/me/learner-profile/", { body: { avatar: "robot" } });
  });

  it("affiche l'échec au tutoiement", async () => {
    PATCH.mockResolvedValue(respond(500, { error: { code: "SERVER_ERROR", message: "" } }));
    render(<AvatarStep />);
    await userEvent.click(screen.getByRole("radio", { name: "Chat" }));
    await userEvent.click(finish());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Une erreur est survenue de notre côté. Réessaie dans quelques instants.",
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("ne présente aucune violation d'accessibilité, même en erreur", async () => {
    PATCH.mockResolvedValue(respond(500, { error: { code: "SERVER_ERROR", message: "" } }));
    const { container } = render(<AvatarStep />);
    await userEvent.click(screen.getByRole("radio", { name: "Chat" }));
    await userEvent.click(finish());
    await screen.findByRole("alert");
    expect(await axe(container)).toHaveNoViolations();
  });
});
