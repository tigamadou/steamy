import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const POST = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));

const { PasswordForm } = await import("./PasswordForm");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const failure = (status: number, code: string, fields?: Record<string, string>) =>
  respond(status, {
    error: {
      code,
      message: "",
      fields: fields && Object.fromEntries(Object.entries(fields).map(([name, text]) => [name, [{ message: text }]])),
    },
  });

const current = () => screen.getByLabelText(/^Mot de passe actuel/);
const next = () => screen.getByLabelText(/^Nouveau mot de passe/);
const confirm = () => screen.getByLabelText(/^Confirme ton nouveau mot de passe/);
const submit = () => userEvent.click(screen.getByRole("button", { name: "Mettre à jour le mot de passe" }));

async function fill(currentPassword = "Ancien2026", newPassword = "Robot2027x", confirmation = newPassword) {
  await userEvent.type(current(), currentPassword);
  await userEvent.type(next(), newPassword);
  await userEvent.type(confirm(), confirmation);
}

describe("PasswordForm (WD18)", () => {
  beforeEach(() => POST.mockReset());

  it("mot de passe actuel, nouveau, règles D25 ; aucun champ de numéro", async () => {
    const { container } = render(<PasswordForm />);
    expect(current()).toHaveAttribute("autocomplete", "current-password");
    expect(next()).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByText("Au moins 8 caractères")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /numéro/i })).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("exige les deux mots de passe sans appeler l'API", async () => {
    render(<PasswordForm />);
    await submit();
    const summary = await screen.findByRole("alert");
    expect(within(summary).getByRole("link", { name: "Indique ton mot de passe actuel." })).toHaveAttribute(
      "href",
      "#mot-de-passe-actuel",
    );
    expect(within(summary).getByRole("link", { name: /respecte les règles/ })).toHaveAttribute(
      "href",
      "#nouveau-mot-de-passe",
    );
    expect(POST).not.toHaveBeenCalled();
  });

  it("refuse une confirmation différente", async () => {
    render(<PasswordForm />);
    await fill("Ancien2026", "Robot2027x", "Robot2027y");
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(/saisi deux fois à l'identique/);
    expect(POST).not.toHaveBeenCalled();
  });

  it("change le mot de passe, vide le formulaire et confirme", async () => {
    POST.mockResolvedValue(respond(204));
    render(<PasswordForm />);
    await fill();
    await submit();
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/api/accounts/me/password/", {
        body: { currentPassword: "Ancien2026", newPassword: "Robot2027x" },
      }),
    );
    const toast = await screen.findByText("Ton mot de passe est mis à jour.");
    expect(toast).toBeInTheDocument();
    expect(current()).toHaveValue("");
    expect(next()).toHaveValue("");
  });

  it("affiche les erreurs de champ issues de `fields`", async () => {
    POST.mockResolvedValue(
      failure(400, "VALIDATION_ERROR", {
        currentPassword: "Mot de passe actuel incorrect.",
        newPassword: "Le nouveau mot de passe doit être différent de l'actuel.",
      }),
    );
    render(<PasswordForm />);
    await fill();
    await submit();
    await screen.findByRole("alert");
    expect(current()).toHaveAccessibleDescription("Mot de passe actuel incorrect.");
    expect(next()).toHaveAccessibleDescription(/Le nouveau mot de passe doit être différent de l'actuel./);
    // La saisie est conservée après une erreur
    expect(next()).toHaveValue("Robot2027x");
  });

  it("une seule erreur de champ", async () => {
    POST.mockResolvedValue(failure(400, "VALIDATION_ERROR", { newPassword: "Trop courant." }));
    render(<PasswordForm />);
    await fill();
    await submit();
    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Trop courant.");
    expect(summary).not.toHaveTextContent("Indique ton mot de passe actuel.");
  });

  it("sans `fields` : message du code (plafond)", async () => {
    POST.mockResolvedValue({
      error: { code: "THROTTLED", message: "" },
      response: new Response(null, { status: 429, headers: { "Retry-After": "30" } }),
    });
    render(<PasswordForm />);
    await fill();
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Trop de tentatives. Réessaie dans 30 secondes.");
  });
});

describe("PasswordForm au vouvoiement (WPD08)", () => {
  beforeEach(() => POST.mockReset());

  it("textes et confirmation du parent", async () => {
    render(<PasswordForm register="vous" />);
    await submit();
    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Indiquez votre mot de passe actuel.");
    // Résumé d'erreurs au vouvoiement dans l'espace parent
    expect(summary).toHaveTextContent("Corrigez les erreurs suivantes :");
    POST.mockResolvedValue(respond(204));
    await userEvent.type(current(), "Ancien2026");
    await userEvent.type(next(), "Robot2027x");
    await userEvent.type(screen.getByLabelText(/^Confirmez votre nouveau mot de passe/), "Robot2027x");
    await submit();
    expect(await screen.findByText("Votre mot de passe est mis à jour.")).toBeInTheDocument();
  });

  it("erreur sans champ au vouvoiement", async () => {
    POST.mockResolvedValue(failure(500, "SERVER_ERROR"));
    render(<PasswordForm register="vous" />);
    await userEvent.type(current(), "Ancien2026");
    await userEvent.type(next(), "Robot2027x");
    await userEvent.type(screen.getByLabelText(/^Confirmez votre nouveau mot de passe/), "Robot2027x");
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Réessayez dans quelques instants.");
  });
});
