import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const POST = vi.fn();
const router = { replace: vi.fn(), refresh: vi.fn() };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { ActivationForm } = await import("./ActivationForm");
const { ACTIVATION_TOKEN_KEY } = await import("./activation-token");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const invitation = { firstName: "Awa", schoolName: "CEG Akpakpa", emailMasked: "a•••@ecole.bj" };
const RULES = "Choisissez un mot de passe qui respecte les règles, saisi deux fois à l'identique.";

function renderForm(overrides: Partial<typeof invitation> | { schoolName: null } = {}) {
  return render(
    <ActivationForm token="jeton-invitation" invitation={{ ...invitation, ...overrides } as never} />,
  );
}

async function submit(password: string, confirm = password) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/^Mot de passe/), password);
  await user.type(screen.getByLabelText(/^Confirmez le mot de passe/), confirm);
  await user.click(screen.getByRole("button", { name: "Activer mon compte" }));
}

describe("ActivationForm (C6)", () => {
  beforeEach(() => {
    POST.mockReset();
    window.sessionStorage.setItem(ACTIVATION_TOKEN_KEY, "jeton-invitation");
    Object.values(router).forEach((fn) => fn.mockReset());
  });

  it("salue l'enseignant", () => {
    renderForm();
    expect(screen.getByText(/Bonjour Awa, choisissez votre mot de passe pour rejoindre Steamy avec CEG Akpakpa\./)).toBeInTheDocument();
    expect(screen.getByText("a•••@ecole.bj").tagName).toBe("STRONG");
  });

  it("omet l'établissement quand l'invitation n'en a pas", () => {
    renderForm({ schoolName: null });
    expect(screen.getByText(/rejoindre Steamy\. Votre identifiant/)).toBeInTheDocument();
    expect(screen.queryByText(/ avec /)).not.toBeInTheDocument();
  });

  it.each([
    ["court1", "court1"],
    ["Steamy2026", "Steamy2027"],
  ])("refuse un mot de passe invalide ou mal confirmé sans appeler l'API (%s / %s)", async (password, confirm) => {
    renderForm();
    await submit(password, confirm);
    expect(await screen.findAllByText(RULES)).not.toHaveLength(0);
    expect(POST).not.toHaveBeenCalled();
  });

  it("active le compte et ouvre l'espace enseignant", async () => {
    POST.mockResolvedValue(respond(200, { data: { role: "teacher" } }));
    renderForm();
    await submit("Steamy2026");
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/enseignant"));
    expect(router.refresh).toHaveBeenCalled();
    expect(POST).toHaveBeenCalledWith("/api/auth/teacher-invitations/accept/", {
      body: { token: "jeton-invitation", password: "Steamy2026" },
    });
    expect(window.sessionStorage.getItem(ACTIVATION_TOKEN_KEY)).toBeNull();
  });

  it("bascule sur le lien expiré quand l'invitation n'est plus valable", async () => {
    POST.mockResolvedValue(respond(400, { error: { code: "INVITATION_INVALID", message: "Invitation invalide." } }));
    renderForm();
    await submit("Steamy2026");
    expect(await screen.findByRole("heading", { name: "Lien expiré ou déjà utilisé" })).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(ACTIVATION_TOKEN_KEY)).toBeNull();
  });

  it.each([
    ["PASSWORD_TOO_WEAK", "Mot de passe trop courant.", undefined, "Mot de passe trop courant."],
    ["VALIDATION_ERROR", "Données invalides.", "Trop proche de votre nom.", "Trop proche de votre nom."],
  ])("affiche le refus %s sous le mot de passe", async (code, message, field, text) => {
    const fields = field ? { password: [{ code: "x", message: field }] } : undefined;
    POST.mockResolvedValue(respond(400, { error: { code, message, fields } }));
    renderForm();
    await submit("Steamy2026");
    expect(await screen.findAllByText(text)).not.toHaveLength(0);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("affiche une autre erreur au vouvoiement", async () => {
    POST.mockRejectedValue(new Error("hors ligne"));
    renderForm();
    await submit("Steamy2026");
    expect(
      await screen.findByText("Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez."),
    ).toBeInTheDocument();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = renderForm();
    expect(screen.getByRole("heading", { name: "Activer votre compte" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
