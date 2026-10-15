import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const POST = vi.fn();
const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { LearnerPasswordForm } = await import("./LearnerPasswordForm");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const RULES = "Choisis un mot de passe qui respecte les règles, saisi deux fois à l'identique.";

async function submit(password: string, confirm = password) {
  const user = userEvent.setup();
  if (password) await user.type(screen.getByLabelText(/^Mot de passe/), password);
  if (confirm) await user.type(screen.getByLabelText(/^Confirme ton mot de passe/), confirm);
  await user.click(screen.getByRole("button", { name: "Valider mon mot de passe" }));
}

describe("LearnerPasswordForm (W10)", () => {
  beforeEach(() => {
    POST.mockReset();
    Object.values(router).forEach((fn) => fn.mockReset());
  });

  it.each([
    ["court1", "court1"],
    ["Steamy2026", "Steamy2027"],
  ])("refuse un mot de passe invalide ou mal confirmé sans appeler l'API (%s / %s)", async (password, confirm) => {
    render(<LearnerPasswordForm />);
    await submit(password, confirm);
    expect(await screen.findAllByText(RULES)).not.toHaveLength(0);
    expect(POST).not.toHaveBeenCalled();
  });

  it("active le compte puis ouvre l'étape de profil restante", async () => {
    POST.mockResolvedValue(
      respond(200, { data: { user: { role: "learner", profileStep: "learner-info" }, csrfToken: "jeton" } }),
    );
    render(<LearnerPasswordForm />);
    await submit("Steamy2026");
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inscription/apprenant/profil/infos"));
    expect(router.refresh).toHaveBeenCalled();
    expect(POST).toHaveBeenCalledWith("/api/auth/learner-signup/password/", { body: { password: "Steamy2026" } });
  });

  it.each([
    ["PASSWORD_TOO_WEAK", "Mot de passe trop courant.", undefined, "Mot de passe trop courant."],
    ["PASSWORD_TOO_WEAK", "Trop faible.", "Trop proche de ton nom.", "Trop proche de ton nom."],
    ["VALIDATION_ERROR", "Données invalides.", "Trop proche de ton prénom.", "Trop proche de ton prénom."],
  ])("affiche le refus %s sous le mot de passe", async (code, message, field, text) => {
    const fields = field ? { password: [{ code: "x", message: field }] } : undefined;
    POST.mockResolvedValue(respond(400, { error: { code, message, fields } }));
    render(<LearnerPasswordForm />);
    await submit("Steamy2026");
    expect(await screen.findAllByText(text)).not.toHaveLength(0);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("affiche toute autre erreur au tutoiement", async () => {
    POST.mockResolvedValue(respond(500));
    render(<LearnerPasswordForm />);
    await submit("Steamy2026");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Une erreur est survenue de notre côté. Réessaie dans quelques instants.",
    );
  });

  it("ne présente aucune violation d'accessibilité, même en erreur", async () => {
    const { container } = render(<LearnerPasswordForm />);
    await submit("", "");
    await screen.findByRole("alert");
    expect(await axe(container)).toHaveNoViolations();
  });
});
