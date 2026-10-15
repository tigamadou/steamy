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
const { CodeScreen } = await import("./CodeScreen");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const challenge = { challengeId: "ch-1", destinationMasked: "+229 01 •• •• 01", expiresInSec: 600, resendInSec: 0 };

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

function renderScreen(patch: Partial<ResetFlowState>) {
  return render(
    <ResetFlowProvider>
      <Seeded patch={patch}>
        <CodeScreen />
        <Probe />
      </Seeded>
    </ResetFlowProvider>,
  );
}

async function submit(code: string) {
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox", { name: /Code à 6 chiffres/ }), code);
  await user.click(screen.getByRole("button", { name: "Vérifier le code" }));
}

describe("CodeScreen (WL03)", () => {
  beforeEach(() => {
    POST.mockReset();
    Object.values(router).forEach((fn) => fn.mockReset());
  });

  it("renvoie à WL02 avec un message sans défi en mémoire", () => {
    const { container } = renderScreen({});
    expect(container.querySelector("form")).toBeNull();
    expect(router.replace).toHaveBeenCalledWith("/mot-de-passe-oublie");
    expect(flow().notice).toBe(RESTART_NOTICE);
  });

  it("annonce le destinataire masqué du SMS et permet de modifier le numéro", async () => {
    renderScreen({ challenge });
    expect(screen.getByText(/vient d'être envoyé à \+229 01 •• •• 01\./)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Code à 6 chiffres reçu par SMS" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Modifier le numéro" }));
    expect(router.push).toHaveBeenCalledWith("/mot-de-passe-oublie");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("libelle le canal email de l'enseignant", () => {
    renderScreen({ challenge, channel: "email" });
    expect(screen.getByRole("textbox", { name: "Code à 6 chiffres reçu par email" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Modifier l'adresse email" })).toBeInTheDocument();
  });

  it("garde le jeton de réinitialisation et passe à WL04", async () => {
    POST.mockResolvedValue(respond(200, { data: { resetToken: "jeton-reset" } }));
    renderScreen({ challenge });
    await submit("123456");
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/mot-de-passe-oublie/nouveau"));
    expect(POST).toHaveBeenCalledWith("/api/auth/password-reset/verify/", {
      body: { challengeId: "ch-1", code: "123456" },
    });
    expect(flow().resetToken).toBe("jeton-reset");
  });

  it("affiche l'erreur d'un code refusé sans changer d'étape", async () => {
    POST.mockResolvedValue(respond(400, { error: { code: "OTP_INVALID", message: "" } }));
    renderScreen({ challenge });
    await submit("123456");
    expect(await screen.findByText("Code incorrect. Vérifiez le message reçu.")).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    expect(flow().resetToken).toBeUndefined();
  });

  it("remplace le défi après un renvoi", async () => {
    const next = { ...challenge, destinationMasked: "+229 01 •• •• 77", expiresInSec: 600, resendInSec: 60 };
    POST.mockResolvedValue(respond(200, { data: next }));
    renderScreen({ challenge });
    await userEvent.click(screen.getByRole("button", { name: "Renvoyer le code" }));
    expect(await screen.findByText(/vient d'être envoyé à \+229 01 •• •• 77\./)).toBeInTheDocument();
    expect(flow().challenge).toEqual(next);
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = renderScreen({ challenge });
    expect(await axe(container)).toHaveNoViolations();
  });
});
