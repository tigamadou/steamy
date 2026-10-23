import { render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const POST = vi.fn();
const router = { replace: vi.fn() };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { ConsentLanding } = await import("./ConsentLanding");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const failure = (status: number, code: string, message = "") => respond(status, { error: { code, message } });
const KEY = "steamy:consentToken";

describe("ConsentLanding (atterrissage du lien SMS)", () => {
  beforeEach(() => {
    POST.mockReset();
    router.replace.mockReset();
    sessionStorage.clear();
    sessionStorage.setItem(KEY, JSON.stringify("jeton"));
  });

  it("signale un lien incomplet sans jeton gardé, sans appeler l'API", async () => {
    sessionStorage.clear();
    const { container } = render(<ConsentLanding />);
    expect(screen.getByText("Ouverture de la demande…")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Lien incomplet ou déjà utilisé" })).toBeInTheDocument();
    expect(POST).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/connexion");
    expect(screen.getByRole("link", { name: "Contacter l'équipe Steamy" })).toHaveAttribute(
      "href",
      "/aide?sujet=question#contact",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("effet rejoué (StrictMode) : un seul `claim`, la demande s'ouvre au lieu de « Lien incomplet »", async () => {
    // Le second appel trouverait le jeton consommé par le premier
    POST.mockResolvedValueOnce(respond(200, { data: { id: 42 } })).mockResolvedValue(failure(404, "NOT_FOUND"));
    render(
      <StrictMode>
        <ConsentLanding />
      </StrictMode>,
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inscription/parent/demande/42"));
    expect(POST).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("heading", { name: "Lien incomplet ou déjà utilisé" })).toBeNull();
  });

  it("rattache la demande d'un parent connecté et l'ouvre", async () => {
    POST.mockResolvedValue(respond(200, { data: { id: 42 } }));
    render(<ConsentLanding />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inscription/parent/demande/42"));
    expect(POST).toHaveBeenCalledWith("/api/accounts/consent-requests/claim/", { body: { token: "jeton" } });
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it("propose la connexion ou la création du compte sans rien dire de l'enfant", async () => {
    POST.mockResolvedValue(failure(401, "NOT_AUTHENTICATED"));
    const { container } = render(<ConsentLanding />);
    expect(
      await screen.findByRole("heading", { name: "Votre enfant vous demande votre accord" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "J'ai déjà un compte" })).toHaveAttribute(
      "href",
      "/connexion?next=%2Fconsentement",
    );
    expect(screen.getByRole("link", { name: "Créer mon compte" })).toHaveAttribute("href", "/inscription/parent");
    // Jeton gardé pour le retour après connexion
    expect(sessionStorage.getItem(KEY)).not.toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it.each([
    ["CONSENT_REQUEST_EXPIRED", 410, "Cette demande a expiré"],
    ["CONSENT_ALREADY_RESOLVED", 409, "Cette demande a déjà reçu une réponse"],
    ["CONSENT_PHONE_MISMATCH", 403, "Cette demande ne vous est pas adressée"],
    ["PERMISSION_DENIED", 403, "Ce lien est réservé au parent"],
    ["NOT_FOUND", 404, "Lien incomplet ou déjà utilisé"],
    ["VALIDATION_ERROR", 400, "Lien incomplet ou déjà utilisé"],
  ])("ferme le lien sur %s et efface le jeton", async (code, status, title) => {
    POST.mockResolvedValue(failure(status, code));
    const { container } = render(<ConsentLanding />);
    expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument();
    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("affiche le message d'une autre erreur en vouvoyant", async () => {
    POST.mockResolvedValue(failure(500, "SERVER_ERROR"));
    render(<ConsentLanding />);
    expect(await screen.findByRole("heading", { name: "Demande indisponible" })).toBeInTheDocument();
    expect(
      screen.getByText("Une erreur est survenue de notre côté. Réessayez dans quelques instants."),
    ).toBeInTheDocument();
  });

  it("ignore une réponse arrivée après le démontage", async () => {
    let resolve!: (value: unknown) => void;
    POST.mockReturnValue(new Promise((r) => (resolve = r)));
    const { unmount } = render(<ConsentLanding />);
    await waitFor(() => expect(POST).toHaveBeenCalled());
    unmount();
    resolve(respond(200, { data: { id: 42 } }));
    await new Promise((r) => setTimeout(r, 0));
    expect(router.replace).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(KEY)).not.toBeNull();
  });
});
