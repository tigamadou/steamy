import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const POST = vi.fn();
const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { RESTART_NOTICE, ResetFlowProvider, useResetFlow } = await import("../ResetFlow");
type ResetFlowState = import("../ResetFlow").ResetFlowState;
const { NewPasswordScreen } = await import("./NewPasswordScreen");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const challenge = { challengeId: "ch-1", destinationMasked: "+229 01 •• •• 01", expiresInSec: 600, resendInSec: 60 };
const RULES = "Choisissez un mot de passe qui respecte les règles, saisi deux fois à l'identique.";

function Seeded({ patch, children }: { patch: Partial<ResetFlowState>; children: ReactNode }) {
  // Écran rendu une fois le parcours amorcé, comme après l'étape précédente
  const { flow, update } = useResetFlow();
  const [initial] = useState(flow);
  useEffect(() => {
    update(patch);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return flow === initial ? null : children;
}

function Probe() {
  const { flow } = useResetFlow();
  return <output data-testid="flow">{JSON.stringify(flow)}</output>;
}

const flow = () => JSON.parse(screen.getByTestId("flow").textContent ?? "{}");

function renderScreen(patch: Partial<ResetFlowState> = { challenge, resetToken: "jeton-reset" }) {
  return render(
    <ResetFlowProvider>
      <Seeded patch={patch}>
        <NewPasswordScreen />
        <Probe />
      </Seeded>
    </ResetFlowProvider>,
  );
}

async function submit(password: string, confirm = password) {
  const user = userEvent.setup();
  if (password) await user.type(screen.getByLabelText(/^Nouveau mot de passe/), password);
  if (confirm) await user.type(screen.getByLabelText(/^Confirmez le mot de passe/), confirm);
  await user.click(screen.getByRole("button", { name: "Enregistrer le mot de passe" }));
}

describe("NewPasswordScreen (WL04)", () => {
  beforeEach(() => {
    POST.mockReset();
    Object.values(router).forEach((fn) => fn.mockReset());
  });

  it("renvoie à WL02 avec un message sans jeton en mémoire", () => {
    const { container } = renderScreen({});
    expect(container.querySelector("form")).toBeNull();
    expect(router.replace).toHaveBeenCalledWith("/mot-de-passe-oublie");
    expect(flow().notice).toBe(RESTART_NOTICE);
  });

  it.each([
    ["court1", "court1"],
    ["Steamy2026", "Steamy2027"],
  ])("refuse un mot de passe invalide ou mal confirmé sans appeler l'API (%s / %s)", async (password, confirm) => {
    renderScreen();
    await submit(password, confirm);
    expect(await screen.findAllByText(RULES)).not.toHaveLength(0);
    expect(POST).not.toHaveBeenCalled();
  });

  it("enregistre le mot de passe et passe à WL05, sans réveiller la garde du parcours", async () => {
    POST.mockResolvedValue(respond(204));
    renderScreen();
    await submit("Steamy2026");
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/mot-de-passe-oublie/termine"));
    expect(POST).toHaveBeenCalledWith("/api/auth/password-reset/confirm/", {
      body: { resetToken: "jeton-reset", password: "Steamy2026" },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(router.replace.mock.calls).toEqual([["/mot-de-passe-oublie/termine"]]);
    expect(flow().notice).toBeUndefined();
  });

  it.each([
    ["PASSWORD_TOO_WEAK", "Mot de passe trop courant.", undefined, "Mot de passe trop courant."],
    ["VALIDATION_ERROR", "Données invalides.", "Trop proche de votre nom.", "Trop proche de votre nom."],
  ])("affiche le refus %s sous le mot de passe", async (code, message, field, text) => {
    const fields = field ? { password: [{ code: "x", message: field }] } : undefined;
    POST.mockResolvedValue(respond(400, { error: { code, message, fields } }));
    renderScreen();
    await submit("Steamy2026");
    expect(await screen.findAllByText(text)).not.toHaveLength(0);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("reprend depuis WL02 quand le jeton est expiré ou déjà utilisé", async () => {
    POST.mockResolvedValue(respond(400, { error: { code: "RESET_TOKEN_INVALID", message: "Jeton invalide." } }));
    renderScreen();
    await submit("Steamy2026");
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/mot-de-passe-oublie"));
    expect(flow()).toEqual({ channel: "sms", notice: RESTART_NOTICE });
  });

  it("affiche une autre erreur au vouvoiement", async () => {
    POST.mockResolvedValue(respond(500));
    renderScreen();
    await submit("Steamy2026");
    expect(
      await screen.findByText("Une erreur est survenue de notre côté. Réessayez dans quelques instants."),
    ).toBeInTheDocument();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = renderScreen();
    expect(screen.getByRole("heading", { name: "Choisissez un nouveau mot de passe" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
