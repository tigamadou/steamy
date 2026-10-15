import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import type { SignupState } from "../signup-steps";

const POST = vi.fn();
const router = { push: vi.fn(), replace: vi.fn() };
const useSignupPolling = vi.fn((initial: SignupState) => initial);
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("./useSignupPolling", () => ({ useSignupPolling }));

const { WaitingScreen } = await import("./WaitingScreen");

const STATE: SignupState = {
  step: "waiting",
  firstName: "Awa",
  username: "awa.k",
  expiresAt: "2026-10-22T08:00:00Z",
  consentRequest: {
    id: 42,
    status: "pending",
    parentPhoneMasked: "+229 01 •• •• 56",
    relationship: "mother",
    expiresAt: "2026-10-17T08:00:00Z",
    resendInSec: 0,
    refusalReason: null,
  },
};

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const resendButton = () => screen.getByRole("button", { name: "Renvoyer la demande" });

describe("WaitingScreen (W07)", () => {
  beforeEach(() => {
    POST.mockReset();
    router.replace.mockReset();
    useSignupPolling.mockImplementation((initial) => initial);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("affiche le numéro masqué, l'attente et l'échéance de la demande", () => {
    render(<WaitingScreen initial={STATE} />);
    expect(useSignupPolling).toHaveBeenCalledWith(STATE);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("On attend l'accord de ton parent…");
    expect(screen.getByText("+229 01 •• •• 56")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("En attente de la réponse…");
    expect(screen.getByText(/Ta demande reste valable jusqu'au 17 octobre 2026/)).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("montre le code de reprise de l'onglet jusqu'à ce qu'il soit noté", async () => {
    sessionStorage.setItem("steamy:resumeCode", "ABCDEFGH");
    render(<WaitingScreen initial={STATE} />);
    expect(screen.getByText("ABCD EFGH")).toBeInTheDocument();
    expect(screen.getByText(/jusqu'au 22 octobre 2026\. On ne pourra pas/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "J'ai noté mon code" }));
    expect(screen.queryByRole("region", { name: "Ton code de reprise" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "J'ai noté mon code" })).not.toBeInTheDocument();
  });

  it("ne lit pas le code de reprise au rendu serveur", () => {
    sessionStorage.setItem("steamy:resumeCode", "ABCDEFGH");
    const html = renderToString(<WaitingScreen initial={STATE} />);
    expect(html).toContain("On attend l&#x27;accord de ton parent…");
    expect(html).not.toContain("ABCD EFGH");
  });

  it("n'affiche pas de code de reprise absent de l'onglet", () => {
    render(<WaitingScreen initial={STATE} />);
    expect(screen.queryByRole("region", { name: "Ton code de reprise" })).not.toBeInTheDocument();
  });

  it("n'affiche pas de code de reprise quand le stockage est indisponible", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("indisponible");
    });
    render(<WaitingScreen initial={STATE} />);
    expect(screen.queryByRole("region", { name: "Ton code de reprise" })).not.toBeInTheDocument();
  });

  it("renvoie vers l'écran de la nouvelle étape quand l'état change", async () => {
    const { rerender } = render(<WaitingScreen initial={STATE} />);
    useSignupPolling.mockImplementation((initial) => ({ ...initial, step: "password" }));
    rerender(<WaitingScreen initial={STATE} />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inscription/apprenant/accord"));
  });

  it("renvoie la demande et relance le décompte avec le délai de l'API", async () => {
    POST.mockResolvedValue(respond(200, { data: { ...STATE.consentRequest, resendInSec: 90 } }));
    render(<WaitingScreen initial={STATE} />);
    await userEvent.click(resendButton());
    expect(await screen.findByText("1:30")).toBeInTheDocument();
    expect(POST).toHaveBeenCalledWith("/api/accounts/consent-requests/{id}/resend/", {
      params: { path: { id: "42" } },
    });
    expect(resendButton()).toBeDisabled();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  it("affiche l'erreur d'un renvoi refusé et attend le délai annoncé", async () => {
    POST.mockResolvedValue({
      error: { code: "THROTTLED", message: "" },
      response: new Response(null, { status: 429, headers: { "Retry-After": "45" } }),
    });
    render(<WaitingScreen initial={STATE} />);
    await userEvent.click(resendButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("Trop de tentatives. Réessaie dans 45 secondes.");
    expect(screen.getByText("0:45")).toBeInTheDocument();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    sessionStorage.setItem("steamy:resumeCode", "ABCDEFGH");
    const { container } = render(<WaitingScreen initial={STATE} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
