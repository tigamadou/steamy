import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const POST = vi.fn();
const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { RESUME_CODE_KEY, SignupDraftProvider, useSignupDraft } = await import("../SignupDraft");
type SignupDraftState = import("../SignupDraft").SignupDraftState;
const { AgeForm } = await import("./AgeForm");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const failure = (status: number, code: string, message = "", fields?: object) =>
  respond(status, { error: { code, message, fields } });

const IDENTITY = { firstName: "Awa", lastName: "Kossou", username: "awa.k", privacyAccepted: true };

function Seeded({ patch, children }: { patch: Partial<SignupDraftState>; children: ReactNode }) {
  // Écran rendu une fois le brouillon de W04 amorcé
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

function renderScreen(patch: Partial<SignupDraftState> = IDENTITY) {
  const view = render(
    <SignupDraftProvider>
      <Seeded patch={patch}>
        <AgeForm />
      </Seeded>
      <Probe />
    </SignupDraftProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Amorcer" }));
  return view;
}

const submit = () => userEvent.click(screen.getByRole("button", { name: "Continuer" }));

describe("AgeForm (W05)", () => {
  beforeEach(() => {
    POST.mockReset();
    Object.values(router).forEach((fn) => fn.mockReset());
    sessionStorage.clear();
  });

  afterEach(() => vi.restoreAllMocks());

  it("renvoie à W04 sans brouillon (rechargement)", () => {
    const { container } = renderScreen({});
    expect(container.querySelector("form")).toBeNull();
    expect(router.replace).toHaveBeenCalledWith("/inscription/apprenant/identite");
  });

  it("propose 13 ans par défaut et reprend l'âge du brouillon", () => {
    renderScreen({ ...IDENTITY, age: 15 });
    expect(screen.getByRole("spinbutton", { name: "Ton âge" })).toHaveAttribute("aria-valuenow", "15");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("crée l'inscription, range le code de reprise et passe à W06", async () => {
    POST.mockResolvedValue(respond(201, { data: { resumeCode: "ABCD-1234" } }));
    renderScreen();
    expect(screen.getByRole("spinbutton", { name: "Ton âge" })).toHaveAttribute("aria-valuenow", "13");
    await userEvent.click(screen.getByRole("button", { name: "Augmenter" }));
    await submit();
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(router.replace.mock.calls).toEqual([["/inscription/apprenant/parent"]]);
    expect(POST).toHaveBeenCalledWith("/api/auth/learner-signup/", { body: { ...IDENTITY, age: 14 } });
    expect(sessionStorage.getItem(RESUME_CODE_KEY)).toBe("ABCD-1234");
    expect(draft()).toMatchObject({ ...IDENTITY, age: 14 });
  });

  it("poursuit même si le stockage de session est indisponible", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("stockage bloqué");
    });
    POST.mockResolvedValue(respond(201, { data: { resumeCode: "ABCD-1234" } }));
    renderScreen();
    await submit();
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(router.replace.mock.calls).toEqual([["/inscription/apprenant/parent"]]);
  });

  it("revient à W04 en état W19 quand l'identifiant est pris", async () => {
    POST.mockResolvedValue(failure(409, "USERNAME_TAKEN"));
    renderScreen();
    await submit();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inscription/apprenant/identite"));
    expect(draft()).toMatchObject({ username: "awa.k", age: 13, usernameTaken: true });
  });

  it.each([
    ["USERNAME_INVALID", undefined],
    ["VALIDATION_ERROR", { username: [{ message: "Identifiant refusé." }] }],
  ])("revient à W04 sans état W19 pour %s", async (code, fields) => {
    POST.mockResolvedValue(failure(400, code, "", fields));
    renderScreen();
    await submit();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inscription/apprenant/identite"));
    expect(draft().usernameTaken).toBe(false);
  });

  it("rappelle la tranche d'âge refusée par le serveur", async () => {
    POST.mockResolvedValue(failure(400, "AGE_OUT_OF_RANGE"));
    renderScreen();
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Steamy est fait pour les 10 à 17 ans.");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("affiche toute autre erreur au tutoiement", async () => {
    POST.mockRejectedValue(new Error("hors ligne"));
    renderScreen();
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Le serveur est injoignable. Vérifie ta connexion internet puis réessaie.",
    );
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = renderScreen();
    expect(await axe(container)).toHaveNoViolations();
  });
});
