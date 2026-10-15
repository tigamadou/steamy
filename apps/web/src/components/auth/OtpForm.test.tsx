import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const POST = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));

const { OtpForm } = await import("./OtpForm");

const challenge = { challengeId: "ch-1", destinationMasked: "+229 01 •• •• 01", expiresInSec: 600, resendInSec: 0 };
const verify = vi.fn();
const onChallenge = vi.fn();
const onEdit = vi.fn();

const respond = (status: number, body: object = {}, headers: Record<string, string> = {}) => ({
  ...body,
  response: new Response(null, { status, headers }),
});

function renderForm(channel: "sms" | "email" = "sms") {
  return render(
    <OtpForm
      challenge={challenge}
      channel={channel}
      verify={verify}
      onChallenge={onChallenge}
      submitLabel="Vérifier le code"
      editLabel="Modifier le numéro"
      onEdit={onEdit}
    />,
  );
}

const codeInput = () => screen.getByRole("textbox", { name: /Code à 6 chiffres/ });
const submitButton = () => screen.getByRole("button", { name: "Vérifier le code" });

async function submit(code: string) {
  const user = userEvent.setup();
  if (code) await user.type(codeInput(), code);
  await user.click(submitButton());
}

describe("OtpForm (WL03, WP02)", () => {
  beforeEach(() => {
    POST.mockReset();
    verify.mockReset();
    onChallenge.mockReset();
    onEdit.mockReset();
  });

  it("demande les 6 chiffres sans appeler l'API", async () => {
    renderForm();
    await submit("123");
    expect(await screen.findByText("Saisissez les 6 chiffres du code.")).toBeInTheDocument();
    expect(verify).not.toHaveBeenCalled();
  });

  it("vérifie le code complet, sans erreur en cas de succès", async () => {
    verify.mockResolvedValue({ ok: true, data: {} });
    renderForm();
    await submit("123456");
    await waitFor(() => expect(verify).toHaveBeenCalledWith("123456"));
    expect(codeInput()).not.toHaveAttribute("aria-invalid");
    expect(submitButton()).toBeEnabled();
  });

  it.each([
    ["OTP_INVALID", "Code faux, il reste 2 essais.", "Code faux, il reste 2 essais.", false],
    ["OTP_INVALID", "", "Code incorrect. Vérifiez le message reçu.", false],
    ["OTP_EXPIRED", "", "Ce code a expiré. Demandez un nouveau code.", true],
    ["OTP_TOO_MANY_ATTEMPTS", "", "Trop d'essais avec ce code. Demandez un nouveau code.", true],
    ["OTP_DAILY_LIMIT", "", "Vous avez reçu le nombre maximal de codes pour aujourd'hui. Réessayez demain.", true],
    ["SERVER_ERROR", "", "Une erreur est survenue de notre côté. Réessayez dans quelques instants.", false],
  ])("affiche l'erreur %s (message « %s ») au vouvoiement", async (code, message, text, locked) => {
    verify.mockResolvedValue({ ok: false, code, message, fields: {} });
    renderForm();
    await submit("123456");
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(codeInput()).toHaveAttribute("aria-invalid", "true");
    if (locked) {
      expect(codeInput()).toBeDisabled();
      expect(submitButton()).toBeDisabled();
    } else {
      expect(codeInput()).toBeEnabled();
      expect(submitButton()).toBeEnabled();
    }
  });

  it("un renvoi réussi efface l'erreur et le verrou, puis une nouvelle erreur s'affiche", async () => {
    const user = userEvent.setup();
    const next = { ...challenge, destinationMasked: "+229 01 •• •• 99", expiresInSec: 600, resendInSec: 0 };
    verify.mockResolvedValue({ ok: false, code: "OTP_EXPIRED", message: "", fields: {} });
    POST.mockResolvedValue(respond(200, { data: next }));
    renderForm();
    await submit("123456");
    expect(await screen.findByText("Ce code a expiré. Demandez un nouveau code.")).toBeInTheDocument();
    expect(codeInput()).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Renvoyer le code" }));
    expect(await screen.findByText("Un nouveau code a été envoyé à +229 01 •• •• 99.")).toBeInTheDocument();
    expect(POST).toHaveBeenCalledWith("/api/auth/otp/resend/", { body: { challengeId: "ch-1" } });
    expect(onChallenge).toHaveBeenCalledWith(next);
    expect(screen.queryByText("Ce code a expiré. Demandez un nouveau code.")).not.toBeInTheDocument();
    expect(codeInput()).toBeEnabled();
    expect(codeInput()).toHaveValue("");

    verify.mockResolvedValue({ ok: false, code: "OTP_INVALID", message: "", fields: {} });
    await submit("654321");
    expect(await screen.findByText("Code incorrect. Vérifiez le message reçu.")).toBeInTheDocument();
  });

  it("signale un renvoi trop tôt et bloque la saisie", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(respond(429, { error: { code: "OTP_RESEND_TOO_EARLY", message: "Trop tôt." } }, { "Retry-After": "0" }));
    renderForm();
    await user.click(screen.getByRole("button", { name: "Renvoyer le code" }));
    expect(await screen.findByText("Patientez encore un peu avant de demander un nouveau code.")).toBeInTheDocument();
    expect(codeInput()).toBeDisabled();
    expect(submitButton()).toBeDisabled();
    expect(onChallenge).not.toHaveBeenCalled();
  });

  it("affiche l'erreur d'un autre échec du renvoi", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(respond(429, { error: { code: "OTP_DAILY_LIMIT", message: "" } }));
    renderForm();
    await user.click(screen.getByRole("button", { name: "Renvoyer le code" }));
    expect(
      await screen.findByText("Vous avez reçu le nombre maximal de codes pour aujourd'hui. Réessayez demain."),
    ).toBeInTheDocument();
    expect(codeInput()).toBeDisabled();
  });

  it("libelle le canal email et revient à la saisie de l'identifiant", async () => {
    renderForm("email");
    expect(screen.getByRole("textbox", { name: "Code à 6 chiffres reçu par email" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Modifier le numéro" }));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = renderForm();
    expect(screen.getByRole("textbox", { name: "Code à 6 chiffres reçu par SMS" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
