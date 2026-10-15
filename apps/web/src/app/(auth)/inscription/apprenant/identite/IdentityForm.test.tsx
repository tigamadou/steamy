import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const GET = vi.fn();
const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ GET }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { SignupDraftProvider, useSignupDraft } = await import("../SignupDraft");
type SignupDraftState = import("../SignupDraft").SignupDraftState;
const { IdentityForm } = await import("./IdentityForm");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const available = (value: boolean) => respond(200, { data: { available: value } });

const RULE =
  "Ton identifiant : 3 à 30 caractères (lettres, chiffres, « . », « _ » ou « - ») avec au moins une lettre, sans « @ ».";
const TAKEN = "Cet identifiant est déjà associé à un compte Steamy.";

function Seeded({ patch, children }: { patch: Partial<SignupDraftState>; children: ReactNode }) {
  // Écran rendu une fois le brouillon amorcé, comme au retour de W05
  const { update } = useSignupDraft();
  const [ready, setReady] = useState(false);
  if (ready) return children;
  return (
    <button
      type="button"
      onClick={() => {
        update(patch);
        setReady(true);
      }}
    >
      Amorcer
    </button>
  );
}

function Probe() {
  const { draft } = useSignupDraft();
  return <output data-testid="draft">{JSON.stringify(draft)}</output>;
}

const draft = () => JSON.parse(screen.getByTestId("draft").textContent ?? "{}");

function renderScreen(patch: Partial<SignupDraftState> = {}) {
  const view = render(
    <SignupDraftProvider>
      <Seeded patch={patch}>
        <IdentityForm />
      </Seeded>
      <Probe />
    </SignupDraftProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Amorcer" }));
  return view;
}

const username = () => screen.getByRole("textbox", { name: /Identifiant/ });
const submit = () => userEvent.click(screen.getByRole("button", { name: "Continuer" }));

async function fill({ first = "Awa", last = "Kossou", user = "awa.k", privacy = true } = {}) {
  const u = userEvent.setup();
  if (first) await u.type(screen.getByRole("textbox", { name: /Prénom/ }), first);
  if (last) await u.type(screen.getByRole("textbox", { name: /^Nom/ }), last);
  if (user) await u.type(username(), user);
  if (privacy) await u.click(screen.getByRole("checkbox", { name: /J'accepte/ }));
}

describe("IdentityForm (W04, W19)", () => {
  beforeEach(() => {
    GET.mockReset();
    Object.values(router).forEach((fn) => fn.mockReset());
  });

  it("signale chaque champ manquant sans appeler l'API", async () => {
    renderScreen();
    await submit();
    expect(screen.getByRole("alert")).toHaveTextContent("Indique ton prénom.");
    expect(screen.getAllByText("Indique ton nom.")).not.toHaveLength(0);
    expect(screen.getAllByText(RULE)).not.toHaveLength(0);
    expect(screen.getAllByText("Accepte les conditions d'utilisation pour continuer.")).not.toHaveLength(0);
    expect(GET).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(draft()).toMatchObject({ firstName: "", usernameTaken: false });
  });

  it("rappelle la règle C7 pour un identifiant qui ressemble à un numéro", async () => {
    renderScreen();
    await fill({ user: "0190123456" });
    await submit();
    expect(screen.getAllByText(RULE)).not.toHaveLength(0);
    expect(GET).not.toHaveBeenCalled();
  });

  it("vérifie la disponibilité à l'envoi puis passe à W05 avec le brouillon", async () => {
    GET.mockResolvedValue(available(true));
    renderScreen();
    await fill({ first: " Awa ", user: "awa.k" });
    await submit();
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/inscription/apprenant/age"));
    expect(GET).toHaveBeenCalledWith("/api/auth/username-availability/", { params: { query: { username: "awa.k" } } });
    expect(draft()).toEqual({
      firstName: "Awa",
      lastName: "Kossou",
      username: "awa.k",
      privacyAccepted: true,
      usernameTaken: false,
    });
  });

  it("laisse le serveur trancher quand la disponibilité est inconnue", async () => {
    GET.mockRejectedValue(new Error("hors ligne"));
    renderScreen();
    await fill();
    await submit();
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/inscription/apprenant/age"));
  });

  it("passe à l'état W19 quand l'identifiant est pris à l'envoi", async () => {
    GET.mockResolvedValue(available(false));
    renderScreen();
    await fill();
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(TAKEN);
    expect(router.push).not.toHaveBeenCalled();
    expect(draft().usernameTaken).toBe(true);
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/connexion");
  });

  it("« Choisir un autre identifiant » efface l'erreur et sélectionne le champ", async () => {
    renderScreen({ firstName: "Awa", lastName: "Kossou", username: "awa.k", privacyAccepted: true, usernameTaken: true });
    expect(username()).toHaveValue("awa.k");
    expect(screen.getAllByText(TAKEN)).not.toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Choisir un autre identifiant" }));
    expect(screen.queryByText(TAKEN)).toBeNull();
    expect(screen.queryByRole("button", { name: "Choisir un autre identifiant" })).toBeNull();
    const input = username() as HTMLInputElement;
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 5]);
  });

  it("efface l'erreur d'identifiant pris dès la saisie", async () => {
    renderScreen({ username: "awa.k", usernameTaken: true });
    await userEvent.type(username(), "2");
    expect(screen.queryByText(TAKEN)).toBeNull();
    expect(username()).toHaveValue("awa.k2");
  });

  it("vérifie la disponibilité au blur d'un identifiant valide seulement", async () => {
    renderScreen();
    const user = userEvent.setup();
    await user.type(username(), "12");
    await user.tab();
    expect(GET).not.toHaveBeenCalled();

    GET.mockResolvedValueOnce(available(true));
    await user.type(username(), "awa");
    await user.tab();
    await waitFor(() => expect(GET).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(TAKEN)).toBeNull();

    GET.mockResolvedValueOnce(available(false));
    await user.click(username());
    await user.tab();
    expect(await screen.findByText(TAKEN)).toBeInTheDocument();
    expect(GET).toHaveBeenLastCalledWith("/api/auth/username-availability/", {
      params: { query: { username: "12awa" } },
    });
  });

  it("ne présente aucune violation d'accessibilité, y compris en état W19", async () => {
    const { container } = renderScreen({ username: "awa.k", usernameTaken: true });
    expect(await axe(container)).toHaveNoViolations();
  });
});
