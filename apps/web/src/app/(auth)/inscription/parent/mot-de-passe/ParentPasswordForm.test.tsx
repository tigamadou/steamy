import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const POST = vi.fn();
const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { ParentPasswordForm } = await import("./ParentPasswordForm");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const KEY = "steamy:parentChallenge";
const CHALLENGE = { challengeId: "ch-1", destinationMasked: "+229 01 •• •• •• 56", expiresInSec: 600, resendInSec: 0 };
const RULES = "Choisissez un mot de passe qui respecte les règles, saisi deux fois à l'identique.";

async function submit(password: string, confirm = password) {
  const user = userEvent.setup();
  if (password) await user.type(screen.getByLabelText(/^Mot de passe/), password);
  if (confirm) await user.type(screen.getByLabelText(/^Confirmez votre mot de passe/), confirm);
  await user.click(screen.getByRole("button", { name: "Valider mon mot de passe" }));
}

describe("ParentPasswordForm (WP03)", () => {
  beforeEach(() => {
    POST.mockReset();
    Object.values(router).forEach((fn) => fn.mockReset());
    sessionStorage.clear();
    sessionStorage.setItem(KEY, JSON.stringify(CHALLENGE));
  });

  it("affiche un chargement sans défi", () => {
    sessionStorage.clear();
    render(<ParentPasswordForm />);
    expect(screen.getByText("Chargement…")).toBeInTheDocument();
    expect(router.replace).toHaveBeenCalledWith("/inscription/parent");
  });

  it.each([
    ["court1", "court1"],
    ["Steamy2026", "Steamy2027"],
  ])("refuse un mot de passe invalide ou mal confirmé sans appeler l'API (%s / %s)", async (password, confirm) => {
    render(<ParentPasswordForm />);
    await submit(password, confirm);
    expect(await screen.findAllByText(RULES)).not.toHaveLength(0);
    expect(POST).not.toHaveBeenCalled();
  });

  it("crée le compte, efface le défi et passe à WP04", async () => {
    POST.mockResolvedValue(respond(201, { data: {} }));
    render(<ParentPasswordForm />);
    await submit("Steamy2026");
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inscription/parent/demande"));
    expect(router.refresh).toHaveBeenCalled();
    expect(POST).toHaveBeenCalledWith("/api/auth/parent-signup/password/", { body: { password: "Steamy2026" } });
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it("va directement à la demande de l'enfant si un jeton est en attente", async () => {
    sessionStorage.setItem("steamy:consentToken", JSON.stringify("jeton"));
    POST.mockResolvedValue(respond(201, { data: {} }));
    render(<ParentPasswordForm />);
    await submit("Steamy2026");
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/consentement"));
  });

  it.each([
    ["PASSWORD_TOO_WEAK", "Mot de passe trop courant.", undefined, "Mot de passe trop courant."],
    ["PASSWORD_TOO_WEAK", "Trop faible.", "Trop proche de votre nom.", "Trop proche de votre nom."],
    ["VALIDATION_ERROR", "Données invalides.", "Trop proche de votre prénom.", "Trop proche de votre prénom."],
  ])("affiche le refus %s sous le mot de passe", async (code, message, field, text) => {
    const fields = field ? { password: [{ code: "x", message: field }] } : undefined;
    POST.mockResolvedValue(respond(400, { error: { code, message, fields } }));
    render(<ParentPasswordForm />);
    await submit("Steamy2026");
    expect(await screen.findAllByText(text)).not.toHaveLength(0);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("affiche toute autre erreur au vouvoiement", async () => {
    POST.mockResolvedValue(respond(500));
    render(<ParentPasswordForm />);
    await submit("Steamy2026");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Une erreur est survenue de notre côté. Réessayez dans quelques instants.",
    );
  });

  it("ne présente aucune violation d'accessibilité, même en erreur", async () => {
    const { container } = render(<ParentPasswordForm />);
    await submit("", "");
    await screen.findByRole("alert");
    expect(await axe(container)).toHaveNoViolations();
  });
});
