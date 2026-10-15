import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const POST = vi.fn();
const router = { push: vi.fn(), replace: vi.fn() };
const COUNTRIES = [{ id: 1, code: "BJ", label: "Bénin", dialCode: "229", phoneRegex: "^01[0-9]{8}$" }];
const useReferential = vi.fn(() => ({ items: COUNTRIES as typeof COUNTRIES | undefined, status: "ready" }));
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/use-referential", () => ({ useReferential }));

const { ResetFlowProvider, useResetFlow } = await import("./ResetFlow");
type ResetFlowState = import("./ResetFlow").ResetFlowState;
const { ForgotScreen } = await import("./ForgotScreen");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });

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

function renderScreen(patch: Partial<ResetFlowState> = {}) {
  return render(
    <ResetFlowProvider>
      <Seeded patch={patch}>
        <ForgotScreen />
        <Probe />
      </Seeded>
    </ResetFlowProvider>,
  );
}

const phone = () => screen.getByRole("textbox", { name: /Numéro de téléphone/ });
const send = () => userEvent.click(screen.getByRole("button", { name: "Recevoir le code" }));

describe("ForgotScreen (WL02)", () => {
  beforeEach(() => {
    POST.mockReset();
    Object.values(router).forEach((fn) => fn.mockReset());
    useReferential.mockReturnValue({ items: COUNTRIES, status: "ready" });
  });

  it("demande un numéro par défaut, sans appeler l'API", async () => {
    renderScreen();
    expect(screen.getByText(/nous vous envoyons un code par SMS/)).toBeInTheDocument();
    await send();
    expect(await screen.findAllByText("Saisissez un numéro de téléphone valide.")).not.toHaveLength(0);
    expect(POST).not.toHaveBeenCalled();
  });

  it("bascule vers l'email de l'enseignant puis revient au SMS", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole("button", { name: "Vous êtes enseignant ? Recevoir le code par email" }));
    expect(flow().channel).toBe("email");
    expect(screen.getByText(/l'adresse email de votre compte enseignant/)).toBeInTheDocument();
    await send();
    expect(await screen.findAllByText("Saisissez votre adresse email.")).not.toHaveLength(0);
    await user.type(screen.getByRole("textbox", { name: /Adresse email/ }), " prof@ecole.bj ");
    POST.mockResolvedValue(respond(200, { data: { challengeId: "ch", destinationMasked: "p•••@ecole.bj", resendInSec: 60 } }));
    await send();
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/api/auth/password-reset/", { body: { identifier: "prof@ecole.bj" } }),
    );
    await user.click(screen.getByRole("button", { name: "Recevoir le code par SMS" }));
    expect(flow().channel).toBe("sms");
    expect(phone()).toBeInTheDocument();
  });

  it("envoie le numéro normalisé et passe à WL03 avec le défi", async () => {
    const challenge = { challengeId: "ch-1", destinationMasked: "+229 01 •• •• 01", expiresInSec: 600, resendInSec: 60 };
    POST.mockResolvedValue(respond(200, { data: challenge }));
    renderScreen({ resetToken: "ancien", notice: "Ancien message" });
    await userEvent.type(phone(), "0190000001");
    await send();
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/mot-de-passe-oublie/code"));
    expect(POST).toHaveBeenCalledWith("/api/auth/password-reset/", { body: { identifier: "+2290190000001" } });
    expect(flow()).toEqual({ channel: "sms", challenge });
  });

  it("affiche l'erreur de champ renvoyée par l'API", async () => {
    POST.mockResolvedValue(
      respond(400, {
        error: {
          code: "VALIDATION_ERROR",
          message: "Données invalides.",
          fields: { identifier: [{ code: "PHONE_INVALID", message: "Numéro inconnu du format." }] },
        },
      }),
    );
    renderScreen();
    await userEvent.type(phone(), "0190000001");
    await send();
    expect(await screen.findAllByText("Numéro inconnu du format.")).not.toHaveLength(0);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("affiche une erreur générale au vouvoiement", async () => {
    POST.mockRejectedValue(new Error("hors ligne"));
    renderScreen();
    await userEvent.type(phone(), "0190000001");
    await send();
    expect(
      await screen.findByText("Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez."),
    ).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("affiche le message de reprise du parcours", () => {
    renderScreen({ notice: "Pour votre sécurité, recommencez." });
    expect(screen.getByText("Pour votre sécurité, recommencez.")).toHaveAttribute("role", "status");
  });

  it("reste utilisable sans liste de pays chargée", () => {
    useReferential.mockReturnValue({ items: undefined, status: "loading" });
    renderScreen();
    expect(screen.getByRole("combobox", { name: "Pays" })).toBeEmptyDOMElement();
  });

  it("propose la connexion et reste accessible", async () => {
    const { container } = renderScreen();
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/connexion");
    expect(await axe(container)).toHaveNoViolations();
  });
});
