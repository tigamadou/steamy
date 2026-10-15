import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const PATCH = vi.fn();
const router = { replace: vi.fn() };
const GOALS = [
  { id: 1, code: "code", label: "Coder", emoji: "💻" },
  { id: 2, code: "robots", label: "Construire des robots", emoji: "🤖" },
  { id: 3, code: "ia", label: "Comprendre l'IA" },
];
type Referential = { items?: object[]; status: string; retry?: () => void };
let goals: Referential;
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ PATCH }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/use-referential", () => ({ useReferential: () => goals }));

const { GoalsStep } = await import("./GoalsStep");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });

async function choose(...labels: string[]) {
  for (const label of labels) await userEvent.click(screen.getByRole("checkbox", { name: label }));
}
const next = () => screen.getByRole("button", { name: /^Suivant ·/ });

describe("GoalsStep (W13)", () => {
  beforeEach(() => {
    PATCH.mockReset();
    router.replace.mockReset();
    goals = { items: GOALS, status: "ready", retry: vi.fn() };
  });

  it("propose de recharger les objectifs après un échec", async () => {
    goals = { items: undefined, status: "error", retry: vi.fn() };
    render(<GoalsStep />);
    expect(screen.getByRole("alert")).toHaveTextContent("Impossible de charger les objectifs.");
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(goals.retry).toHaveBeenCalled();
  });

  it("montre le chargement des objectifs", () => {
    goals = { items: undefined, status: "loading" };
    render(<GoalsStep />);
    expect(screen.getByText("Chargement des objectifs…")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("désactive « Suivant » sous deux objectifs et compte la sélection", async () => {
    render(<GoalsStep />);
    expect(next()).toBeDisabled();
    expect(next()).toHaveTextContent("Suivant · 0 sélectionné");
    await choose("Coder");
    expect(next()).toBeDisabled();
    expect(next()).toHaveTextContent("Suivant · 1 sélectionné");
    await choose("Construire des robots");
    expect(next()).toBeEnabled();
    expect(next()).toHaveTextContent("Suivant · 2 sélectionnés");
  });

  it("enregistre les objectifs puis passe à W14", async () => {
    PATCH.mockResolvedValue(respond(200, { data: { profileStep: "learner-avatar" } }));
    render(<GoalsStep />);
    await choose("Coder", "Comprendre l'IA");
    await userEvent.click(next());
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inscription/apprenant/profil/avatar"));
    expect(PATCH).toHaveBeenCalledWith("/api/accounts/me/learner-profile/", { body: { goals: ["code", "ia"] } });
  });

  it.each([
    [{ code: "VALIDATION_ERROR", message: "", fields: { goals: [{ message: "Choisis au moins 2 objectifs." }] } }, 400, "Choisis au moins 2 objectifs."],
    [{ code: "SERVER_ERROR", message: "" }, 500, "Une erreur est survenue de notre côté. Réessaie dans quelques instants."],
  ])("affiche le refus de l'API (%#)", async (error, status, text) => {
    PATCH.mockResolvedValue(respond(status, { error }));
    render(<GoalsStep />);
    await choose("Coder", "Construire des robots");
    await userEvent.click(next());
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("ne présente aucune violation d'accessibilité, même en erreur", async () => {
    PATCH.mockResolvedValue(respond(500, { error: { code: "SERVER_ERROR", message: "" } }));
    const { container } = render(<GoalsStep />);
    await choose("Coder", "Construire des robots");
    await userEvent.click(next());
    await screen.findByRole("alert");
    expect(await axe(container)).toHaveNoViolations();
  });
});
