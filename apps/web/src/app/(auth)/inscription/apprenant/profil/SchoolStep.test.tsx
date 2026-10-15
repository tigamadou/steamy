import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const PATCH = vi.fn();
const router = { replace: vi.fn() };
const GRADES = [
  { id: 1, code: "6e", label: "6e" },
  { id: 2, code: "5e", label: "5e" },
];
const DISABILITIES = [{ id: 1, code: "visual", label: "Visuel" }];
type Referential = { items?: object[]; status: string; retry?: () => void };
const referentials: Record<string, Referential> = {};
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ PATCH }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/use-referential", () => ({ useReferential: (name: string) => referentials[name] }));

const { SchoolStep } = await import("./SchoolStep");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });

const grade = () => screen.getByRole("combobox", { name: /Ta classe/ });
const disability = () => screen.getByRole("combobox", { name: /Situation de handicap/ });
const send = () => userEvent.click(screen.getByRole("button", { name: "Suivant" }));

describe("SchoolStep (W12)", () => {
  beforeEach(() => {
    PATCH.mockReset();
    router.replace.mockReset();
    referentials["school-grades"] = { items: GRADES, status: "ready", retry: vi.fn() };
    referentials.disabilities = { items: DISABILITIES, status: "ready", retry: vi.fn() };
  });

  it("exige la classe sans appeler l'API", async () => {
    render(<SchoolStep />);
    await send();
    expect(await screen.findByRole("alert")).toHaveTextContent("Choisis ta classe.");
    expect(PATCH).not.toHaveBeenCalled();
  });

  it("envoie le genre et le handicap facultatifs à null quand ils ne sont pas renseignés", async () => {
    PATCH.mockResolvedValue(respond(200, { data: { profileStep: "learner-goals" } }));
    render(<SchoolStep />);
    await userEvent.selectOptions(grade(), "5e");
    await send();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inscription/apprenant/profil/objectifs"));
    expect(PATCH).toHaveBeenCalledWith("/api/accounts/me/learner-profile/", {
      body: { schoolGrade: "5e", gender: null, disability: null },
    });
  });

  it("envoie le genre et le handicap choisis", async () => {
    PATCH.mockResolvedValue(respond(200, { data: { profileStep: "learner-goals" } }));
    render(<SchoolStep />);
    await userEvent.selectOptions(grade(), "6e");
    await userEvent.click(screen.getByRole("radio", { name: /Fille/ }));
    await userEvent.selectOptions(disability(), "visual");
    await send();
    await waitFor(() =>
      expect(PATCH).toHaveBeenCalledWith("/api/accounts/me/learner-profile/", {
        body: { schoolGrade: "6e", gender: "female", disability: "visual" },
      }),
    );
  });

  it.each([
    [{ code: "VALIDATION_ERROR", message: "", fields: { schoolGrade: [{ message: "Classe inconnue." }] } }, 400, "Classe inconnue."],
    [{ code: "SERVER_ERROR", message: "" }, 500, "Une erreur est survenue de notre côté. Réessaie dans quelques instants."],
  ])("affiche le refus de l'API (%#)", async (error, status, text) => {
    PATCH.mockResolvedValue(respond(status, { error }));
    render(<SchoolStep />);
    await userEvent.selectOptions(grade(), "6e");
    await send();
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("montre le chargement des référentiels pas encore demandés", async () => {
    referentials["school-grades"] = { items: undefined, status: "idle" };
    referentials.disabilities = { items: undefined, status: "idle" };
    render(<SchoolStep />);
    expect(grade()).toHaveAttribute("aria-busy", "true");
    expect(disability()).toHaveAttribute("aria-busy", "true");
    await send();
    expect(await screen.findByRole("alert")).toHaveTextContent("Choisis ta classe.");
  });

  it("propose de recharger les listes après un échec", async () => {
    referentials["school-grades"] = { items: undefined, status: "error", retry: vi.fn() };
    referentials.disabilities = { items: undefined, status: "error", retry: vi.fn() };
    render(<SchoolStep />);
    const [retryGrades, retryDisabilities] = screen.getAllByRole("button", { name: "Réessayer" });
    await userEvent.click(retryGrades);
    await userEvent.click(retryDisabilities);
    expect(referentials["school-grades"].retry).toHaveBeenCalled();
    expect(referentials.disabilities.retry).toHaveBeenCalled();
  });

  it("ne présente aucune violation d'accessibilité, même en erreur", async () => {
    const { container } = render(<SchoolStep />);
    await send();
    await screen.findByRole("alert");
    expect(await axe(container)).toHaveNoViolations();
  });
});
