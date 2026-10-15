import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const POST = vi.fn();
const router = { push: vi.fn(), replace: vi.fn() };
const COUNTRIES = [{ id: 1, code: "BJ", label: "Bénin", dialCode: "229", phoneRegex: "^01[0-9]{8}$" }];
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/use-referential", () => ({ useReferential: () => ({ items: COUNTRIES, status: "ready" }) }));

const { ParentSignupForm } = await import("./ParentSignupForm");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const failure = (status: number, code: string, message = "", fields?: object) =>
  respond(status, { error: { code, message, fields } });
const CHALLENGE = { challengeId: "ch-1", destinationMasked: "+229 01 •• •• •• 56", expiresInSec: 600, resendInSec: 30 };

const send = () => userEvent.click(screen.getByRole("button", { name: "Recevoir mon code par SMS" }));

async function fill() {
  await userEvent.type(screen.getByRole("textbox", { name: /^Prénom/ }), " Koffi ");
  await userEvent.type(screen.getByRole("textbox", { name: /^Nom/ }), "Mensah");
  await userEvent.type(screen.getByRole("textbox", { name: /Numéro de téléphone/ }), "0190123456");
  await userEvent.click(screen.getByRole("checkbox"));
}

describe("ParentSignupForm (WP01)", () => {
  beforeEach(() => {
    POST.mockReset();
    Object.values(router).forEach((fn) => fn.mockReset());
    sessionStorage.clear();
  });
  afterEach(() => sessionStorage.clear());

  it("exige prénom, nom, numéro et conditions sans appeler l'API", async () => {
    render(<ParentSignupForm />);
    await send();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Indiquez votre prénom.");
    expect(alert).toHaveTextContent("Indiquez votre nom.");
    expect(alert).toHaveTextContent("Indiquez un numéro de téléphone valide.");
    expect(alert).toHaveTextContent("Acceptez les conditions d'utilisation pour continuer.");
    expect(POST).not.toHaveBeenCalled();
  });

  it("n'appelle aucun aperçu sans jeton de consentement", () => {
    render(<ParentSignupForm />);
    expect(POST).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("range le défi dans l'onglet puis ouvre la saisie du code", async () => {
    POST.mockResolvedValue(respond(201, { data: CHALLENGE }));
    render(<ParentSignupForm />);
    await fill();
    await send();
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/inscription/parent/code"));
    expect(POST).toHaveBeenCalledWith("/api/auth/parent-signup/", {
      body: { firstName: "Koffi", lastName: "Mensah", phone: "+2290190123456", privacyAccepted: true },
    });
    expect(JSON.parse(sessionStorage.getItem("steamy:parentChallenge")!)).toEqual(CHALLENGE);
  });

  it.each([
    [failure(400, "PHONE_INVALID", "Ce numéro n'est pas valide."), "Ce numéro n'est pas valide."],
    [failure(400, "VALIDATION_ERROR", "", { phone: [{ message: "Numéro refusé." }] }), "Numéro refusé."],
    [failure(500, "SERVER_ERROR"), "Une erreur est survenue de notre côté. Réessayez dans quelques instants."],
  ])("affiche le refus de l'API au vouvoiement (%#)", async (response, text) => {
    POST.mockResolvedValue(response);
    render(<ParentSignupForm />);
    await fill();
    await send();
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("annonce le numéro masqué de la demande de l'enfant", async () => {
    sessionStorage.setItem("steamy:consentToken", JSON.stringify("jeton"));
    POST.mockResolvedValue(respond(200, { data: { parentPhoneMasked: "+229 01 •• •• •• 56" } }));
    const { container } = render(<ParentSignupForm />);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Votre enfant a envoyé sa demande au +229 01 •• •• •• 56 : inscrivez-vous avec ce numéro pour la voir.",
    );
    expect(POST).toHaveBeenCalledWith("/api/accounts/consent-requests/preview/", { body: { token: "jeton" } });
    expect(await axe(container)).toHaveNoViolations();
  });

  it("ignore l'échec de l'aperçu", async () => {
    sessionStorage.setItem("steamy:consentToken", JSON.stringify("jeton"));
    POST.mockResolvedValue(failure(404, "NOT_FOUND"));
    render(<ParentSignupForm />);
    await waitFor(() => expect(POST).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("ignore un aperçu arrivé après le démontage", async () => {
    sessionStorage.setItem("steamy:consentToken", JSON.stringify("jeton"));
    let resolve: (value: unknown) => void = () => {};
    POST.mockReturnValue(new Promise((r) => (resolve = r)));
    const { unmount } = render(<ParentSignupForm />);
    await waitFor(() => expect(POST).toHaveBeenCalled());
    unmount();
    resolve(respond(200, { data: { parentPhoneMasked: "+229 01 •• •• •• 56" } }));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("ne présente aucune violation d'accessibilité, même en erreur", async () => {
    const { container } = render(<ParentSignupForm />);
    await send();
    await screen.findByRole("alert");
    expect(await axe(container)).toHaveNoViolations();
  });
});
