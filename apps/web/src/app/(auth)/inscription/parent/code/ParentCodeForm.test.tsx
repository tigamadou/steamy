import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const POST = vi.fn();
const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { ParentCodeForm } = await import("./ParentCodeForm");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const CHALLENGE = { challengeId: "ch-1", destinationMasked: "+229 01 •• •• •• 56", expiresInSec: 600, resendInSec: 0 };
const KEY = "steamy:parentChallenge";

async function submit(code = "123456") {
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox", { name: /Code à 6 chiffres/ }), code);
  await user.click(screen.getByRole("button", { name: "Vérifier le code" }));
}

describe("ParentCodeForm (WP02)", () => {
  beforeEach(() => {
    POST.mockReset();
    Object.values(router).forEach((fn) => fn.mockReset());
    sessionStorage.clear();
    sessionStorage.setItem(KEY, JSON.stringify(CHALLENGE));
  });

  it("affiche un chargement sans défi et renvoie à WP01", () => {
    sessionStorage.clear();
    render(<ParentCodeForm />);
    expect(screen.getByText("Chargement…")).toBeInTheDocument();
    expect(router.replace).toHaveBeenCalledWith("/inscription/parent");
  });

  it("rappelle le numéro masqué et passe au mot de passe pour un nouveau compte", async () => {
    POST.mockResolvedValue(respond(200, { data: { existingAccount: false } }));
    render(<ParentCodeForm />);
    expect(screen.getByText("+229 01 •• •• •• 56")).toBeInTheDocument();
    await submit();
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/inscription/parent/mot-de-passe"));
    expect(POST).toHaveBeenCalledWith("/api/auth/parent-signup/verify/", {
      body: { challengeId: "ch-1", code: "123456" },
    });
    expect(sessionStorage.getItem(KEY)).not.toBeNull();
  });

  it("efface le défi et propose la connexion pour un compte existant", async () => {
    POST.mockResolvedValue(respond(200, { data: { existingAccount: true } }));
    render(<ParentCodeForm />);
    await submit();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/connexion?compte=existant"));
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it("revient à la demande de l'enfant après connexion d'un compte existant", async () => {
    sessionStorage.setItem("steamy:consentToken", JSON.stringify("jeton"));
    POST.mockResolvedValue(respond(200, { data: { existingAccount: true } }));
    render(<ParentCodeForm />);
    await submit();
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/connexion?compte=existant&next=%2Fconsentement"),
    );
  });

  it("affiche l'échec de la vérification", async () => {
    POST.mockResolvedValue(respond(400, { error: { code: "OTP_INVALID", message: "Code faux." } }));
    render(<ParentCodeForm />);
    await submit();
    expect(await screen.findByText("Code faux.")).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("revient à WP01 pour modifier le numéro", async () => {
    render(<ParentCodeForm />);
    await userEvent.click(screen.getByRole("button", { name: "Modifier le numéro" }));
    expect(router.push).toHaveBeenCalledWith("/inscription/parent");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<ParentCodeForm />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
