import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const PATCH = vi.fn();
const router = { replace: vi.fn() };
const GOALS = [
  { id: 1, code: "code", label: "Coder", emoji: "💻" },
  { id: 2, code: "robots", label: "Construire des robots", emoji: "🤖" },
];
type Referential = { items?: object[]; status: string; retry?: () => void };
let goals: Referential;
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ PATCH }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/use-referential", () => ({ useReferential: () => goals }));

const { ChildrenStep } = await import("./ChildrenStep");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const finish = () => screen.getByRole("button", { name: /Terminer mon profil/ });

describe("ChildrenStep (WP09)", () => {
  beforeEach(() => {
    PATCH.mockReset();
    router.replace.mockReset();
    goals = { items: GOALS, status: "ready", retry: vi.fn() };
  });

  it("propose de recharger les objectifs après un échec", async () => {
    goals = { items: undefined, status: "error", retry: vi.fn() };
    render(<ChildrenStep />);
    expect(screen.getByRole("alert")).toHaveTextContent("Impossible de charger les objectifs.");
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(goals.retry).toHaveBeenCalled();
  });

  it("montre le chargement des objectifs", () => {
    goals = { items: undefined, status: "loading" };
    render(<ChildrenStep />);
    expect(screen.getByText("Chargement des objectifs…")).toBeInTheDocument();
  });

  it("désactive la fin du profil sans objectif et compte la sélection", async () => {
    render(<ChildrenStep />);
    expect(finish()).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", { name: /Coder/ }));
    expect(finish()).toBeEnabled();
    expect(screen.getByText("1 choisi · au moins 1")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: /Construire des robots/ }));
    expect(screen.getByText("2 choisis · au moins 1")).toBeInTheDocument();
  });

  it("enregistre le nombre d'enfants et les objectifs, puis passe à WP10", async () => {
    PATCH.mockResolvedValue(respond(200, { data: {} }));
    render(<ChildrenStep />);
    await userEvent.click(screen.getByRole("button", { name: "Augmenter" }));
    expect(screen.getByRole("spinbutton", { name: "Nombre d'enfants à inscrire" })).toHaveTextContent("2");
    await userEvent.click(screen.getByRole("checkbox", { name: /Coder/ }));
    await userEvent.click(finish());
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inscription/parent/bienvenue"));
    expect(PATCH).toHaveBeenCalledWith("/api/accounts/me/parent-profile/", {
      body: { childrenToEnroll: 2, goalsForChildren: ["code"] },
    });
  });

  it("affiche l'échec de l'enregistrement au vouvoiement", async () => {
    PATCH.mockResolvedValue(respond(500));
    const { container } = render(<ChildrenStep />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Coder/ }));
    await userEvent.click(finish());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Une erreur est survenue de notre côté. Réessayez dans quelques instants.",
    );
    expect(router.replace).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });
});
