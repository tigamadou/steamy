import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const login = vi.fn();
const router = { replace: vi.fn(), refresh: vi.fn(), push: vi.fn() };
const setResumeIdentifier = vi.fn();
vi.mock("@/lib/auth/login", () => ({ login }));
vi.mock("@/lib/auth/resume-handoff", () => ({ setResumeIdentifier }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/use-referential", () => ({
  useReferential: () => ({
    items: [{ id: 1, code: "BJ", label: "Bénin", dialCode: "229", phoneRegex: "^01[0-9]{8}$" }],
    status: "ready",
    retry: vi.fn(),
  }),
}));

const { LoginForm } = await import("./LoginForm");

async function submit(identifier: string, password: string) {
  const user = userEvent.setup();
  if (identifier) await user.type(screen.getByRole("textbox", { name: /Identifiant ou numéro/ }), identifier);
  if (password) await user.type(screen.getByLabelText(/^Mot de passe/), password);
  await user.click(screen.getByRole("button", { name: "Se connecter" }));
}

describe("LoginForm (W16)", () => {
  beforeEach(() => {
    login.mockReset();
    Object.values(router).forEach((fn) => fn.mockReset());
    setResumeIdentifier.mockReset();
  });

  it("demande les deux champs sans appeler l'API", async () => {
    render(<LoginForm next={null} />);
    await submit("", "");
    expect(await screen.findAllByText("Saisis ton identifiant ou ton numéro.")).not.toHaveLength(0);
    expect(screen.getAllByText("Saisis ton mot de passe.")).not.toHaveLength(0);
    expect(login).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveFocus();
  });

  it("connecte avec le numéro normalisé et va vers l'espace du rôle", async () => {
    login.mockResolvedValue({ ok: true, data: { role: "parent", profileStep: null } });
    render(<LoginForm next={null} />);
    await submit("0190000001", "Steamy2026");
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/parent"));
    expect(login).toHaveBeenCalledWith("+2290190000001", "Steamy2026");
    expect(router.refresh).toHaveBeenCalled();
  });

  it("revient à la page demandée (`next` déjà validé)", async () => {
    login.mockResolvedValue({ ok: true, data: { role: "learner", profileStep: null } });
    render(<LoginForm next="/apprenant/catalogue" />);
    await submit("lea.adjovi", "Steamy2026");
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/apprenant/catalogue"));
  });

  it.each([
    ["INVALID_CREDENTIALS", undefined, "Identifiant ou mot de passe incorrect."],
    ["ACCOUNT_SUSPENDED", undefined, "Ce compte est suspendu."],
    ["ACCOUNT_DEACTIVATED", undefined, "Ce compte est désactivé."],
    ["THROTTLED", 30, "Trop de tentatives. Réessaie dans 30 secondes."],
    ["THROTTLED", undefined, "Trop de tentatives. Réessaie dans quelques instants."],
    ["NETWORK_UNAVAILABLE", undefined, "Le serveur est injoignable. Vérifie ta connexion internet puis réessaie."],
    ["PHONE_INVALID", undefined, "Message de l'API."],
  ])("affiche l'erreur %s au tutoiement", async (code, retryAfter, text) => {
    login.mockResolvedValue({ ok: false, code, message: "Message de l'API.", fields: {}, retryAfter });
    render(<LoginForm next={null} />);
    await submit("lea.adjovi", "mauvais1");
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: /Identifiant ou numéro/ })).toHaveValue("lea.adjovi");
  });

  it("propose le contact WL24 à un compte suspendu", async () => {
    login.mockResolvedValue({ ok: false, code: "ACCOUNT_SUSPENDED", message: "" });
    render(<LoginForm next={null} />);
    await submit("lea.adjovi", "Steamy2026");
    expect(await screen.findByRole("link", { name: "Contacter l'équipe Steamy" })).toHaveAttribute(
      "href",
      "/aide?sujet=question#contact",
    );
  });

  it("bascule un compte en attente vers la reprise, identifiant transmis hors URL (C5)", async () => {
    login.mockResolvedValue({ ok: false, code: "ACCOUNT_PENDING_CONSENT", message: "" });
    render(<LoginForm next={null} />);
    await submit(" lea.adjovi ", "Steamy2026");
    await userEvent.click(await screen.findByRole("button", { name: "Reprendre mon inscription" }));
    expect(setResumeIdentifier).toHaveBeenCalledWith("lea.adjovi");
    expect(router.push).toHaveBeenCalledWith("/inscription/reprendre");
  });

  it("propose l'inscription et la reprise, et reste accessible", async () => {
    const { container } = render(<LoginForm next={null} />);
    expect(screen.getByRole("link", { name: "Inscris-toi" })).toHaveAttribute("href", "/inscription/type");
    expect(screen.getByRole("link", { name: "Reprendre mon inscription" })).toHaveAttribute(
      "href",
      "/inscription/reprendre",
    );
    expect(screen.getByLabelText(/^Mot de passe/)).toHaveAttribute("autocomplete", "current-password");
    expect(await axe(container)).toHaveNoViolations();
  });
});
