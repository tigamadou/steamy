import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const POST = vi.fn();
const redirect = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }), redirect }));

const { TeacherActivation } = await import("./TeacherActivation");
const { ACTIVATION_TOKEN_KEY, forgetActivationToken, takeActivationToken } = await import("./activation-token");
const { default: ActivationPage, metadata } = await import("./page");
const { default: FormerActivationLink } = await import("./[token]/page");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const invitation = { firstName: "Awa", schoolName: "CEG Akpakpa", emailMasked: "a•••@ecole.bj" };

function openLink(hash: string) {
  window.history.replaceState(null, "", `/activation${hash}`);
}

describe("Écran d'activation (C6, jeton dans le fragment)", () => {
  beforeEach(() => {
    POST.mockReset();
    window.sessionStorage.clear();
    openLink("");
  });

  it("lit le jeton du fragment, le retire de l'adresse et relit l'invitation par POST", async () => {
    openLink("#jeton=abc_DEF-123");
    POST.mockResolvedValue(respond(200, { data: invitation }));
    render(<TeacherActivation />);
    expect(screen.getByRole("status")).toHaveTextContent("Vérification de votre invitation…");
    expect(await screen.findByRole("heading", { name: "Activer votre compte" })).toBeInTheDocument();
    expect(window.location.pathname + window.location.hash).toBe("/activation");
    expect(POST).toHaveBeenCalledWith("/api/auth/teacher-invitations/lookup/", { body: { token: "abc_DEF-123" } });
    expect(window.sessionStorage.getItem(ACTIVATION_TOKEN_KEY)).toBe("abc_DEF-123");
  });

  it("reprend le jeton de l'onglet après un rechargement", async () => {
    window.sessionStorage.setItem(ACTIVATION_TOKEN_KEY, "jeton-garde");
    POST.mockResolvedValue(respond(200, { data: invitation }));
    render(<TeacherActivation />);
    expect(await screen.findByRole("heading", { name: "Activer votre compte" })).toBeInTheDocument();
    expect(POST).toHaveBeenCalledWith("/api/auth/teacher-invitations/lookup/", { body: { token: "jeton-garde" } });
  });

  it.each(["", "#jeton=", "#autre=abc", "#jeton=a b"])("sans jeton lisible (%s) : lien expiré, sans appel", async (hash) => {
    openLink(hash);
    render(<TeacherActivation />);
    expect(await screen.findByRole("heading", { name: "Lien expiré ou déjà utilisé" })).toBeInTheDocument();
    expect(POST).not.toHaveBeenCalled();
  });

  it("oublie un jeton refusé et affiche le lien expiré", async () => {
    openLink("#jeton=perime");
    POST.mockResolvedValue(respond(400, { error: { code: "INVITATION_INVALID", message: "" } }));
    render(<TeacherActivation />);
    expect(await screen.findByRole("heading", { name: "Lien expiré ou déjà utilisé" })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(ACTIVATION_TOKEN_KEY)).toBeNull();
  });

  it("propose de réessayer après une autre erreur", async () => {
    openLink("#jeton=abc");
    POST.mockRejectedValueOnce(new Error("hors ligne")).mockResolvedValueOnce(respond(200, { data: invitation }));
    render(<TeacherActivation />);
    expect(await screen.findByRole("heading", { level: 1 })).not.toHaveTextContent("Activer votre compte");
    await userEvent.setup().click(screen.getByRole("button", { name: /Réessayer/ }));
    expect(await screen.findByRole("heading", { name: "Activer votre compte" })).toBeInTheDocument();
    expect(POST).toHaveBeenCalledTimes(2);
  });

  it("ignore une réponse arrivée après le démontage", async () => {
    openLink("#jeton=abc");
    let resolve: (value: unknown) => void = () => {};
    POST.mockReturnValue(new Promise((r) => (resolve = r)));
    const { unmount } = render(<TeacherActivation />);
    unmount();
    resolve(respond(200, { data: invitation }));
    await Promise.resolve();
    expect(POST).toHaveBeenCalledTimes(1);
  });

  it("supporte un stockage de l'onglet refusé", () => {
    const getter = vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new Error("refusé");
    });
    openLink("#jeton=abc");
    expect(takeActivationToken()).toBe("abc");
    expect(takeActivationToken()).toBeNull();
    forgetActivationToken();
    getter.mockRestore();
  });

  it("supporte une écriture refusée dans l'onglet", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("plein");
    });
    openLink("#jeton=abc");
    expect(takeActivationToken()).toBe("abc");
    setItem.mockRestore();
  });

  it("sert la page /activation avec son titre", () => {
    expect(metadata.title).toBe("Activation du compte");
    expect(ActivationPage().type).toBe(TeacherActivation);
  });

  it("redirige l'ancien lien vers le fragment", async () => {
    await FormerActivationLink({ params: Promise.resolve({ token: "ancien_jeton" }) } as PageProps<"/activation/[token]">);
    expect(redirect).toHaveBeenCalledWith("/activation#jeton=ancien_jeton");
  });
});
