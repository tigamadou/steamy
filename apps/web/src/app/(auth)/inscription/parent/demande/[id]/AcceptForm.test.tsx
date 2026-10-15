import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const POST = vi.fn();
const router = { replace: vi.fn(), refresh: vi.fn() };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { AcceptForm } = await import("./AcceptForm");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });

async function accept() {
  await userEvent.click(screen.getByRole("button", { name: "Accepter la demande" }));
}

describe("AcceptForm (WP05)", () => {
  beforeEach(() => {
    POST.mockReset();
    Object.values(router).forEach((fn) => fn.mockReset());
  });

  it("accepte la demande et mène à WP06", async () => {
    POST.mockResolvedValue(respond(200, { data: { id: 7, status: "accepted" } }));
    render(<AcceptForm id={7} />);
    await accept();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inscription/parent/demande/7/acceptee"));
    expect(POST).toHaveBeenCalledWith("/api/accounts/consent-requests/{id}/accept/", {
      params: { path: { id: "7" } },
    });
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it.each([
    ["CONSENT_ALREADY_RESOLVED", 409, "Cette demande a déjà reçu une réponse."],
    ["CONSENT_REQUEST_EXPIRED", 410, "Cette demande a expiré."],
  ])("rafraîchit l'écran sur %s et affiche le message", async (code, status, message) => {
    POST.mockResolvedValue(respond(status, { error: { code, message } }));
    render(<AcceptForm id={7} />);
    await accept();
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("affiche une autre erreur sans rafraîchir", async () => {
    POST.mockRejectedValue(new Error("hors ligne"));
    render(<AcceptForm id={7} />);
    await accept();
    expect(
      await screen.findByText("Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez."),
    ).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("propose le refus (WP11)", async () => {
    const { container } = render(<AcceptForm id={7} />);
    expect(screen.getByRole("link", { name: "Refuser" })).toHaveAttribute(
      "href",
      "/inscription/parent/demande/7/refus",
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
