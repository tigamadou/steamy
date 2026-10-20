import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetReferentials } from "@/lib/use-referential";
import { COUNTRIES, NETWORKS, payment } from "@/test/payment-request-fixtures";

const GET = vi.fn();
const POST = vi.fn();
const router = { refresh: vi.fn() };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ GET, POST }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/use-visible-polling", () => ({
  useVisiblePolling: (poll: () => void, _ms: number, enabled: boolean) => {
    useEffect(() => {
      if (enabled) poll();
    }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  },
}));

const { PendingOrderPayment } = await import("./PendingOrderPayment");

const respond = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });
const PREFERRED = { country: "BJ", network: "mtn", phone: "+2290190000001" };

describe("PendingOrderPayment : reprise depuis /parent/commandes/[reference]", () => {
  beforeEach(() => {
    resetReferentials();
    POST.mockReset();
    router.refresh.mockReset();
    GET.mockImplementation(async (path: string) =>
      path === "/api/referentials/payment-networks/"
        ? respond(200, NETWORKS)
        : respond(200, payment({ status: "succeeded" })),
    );
  });

  it("paiement déjà en cours : le parent est invité à le valider, la commande reste payable", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValueOnce({
      error: { code: "PAYMENT_IN_PROGRESS", message: "" },
      response: new Response(null, { status: 409 }),
    });
    render(<PendingOrderPayment reference="CMD-1" total={25000} countries={COUNTRIES} preferred={PREFERRED} />);
    await screen.findByRole("radio", { name: "MTN Mobile Money" });
    await user.click(screen.getByRole("button", { name: /^Payer/ }));
    expect(POST).toHaveBeenCalledWith("/api/payments/orders/{reference}/payments/", {
      params: { path: { reference: "CMD-1" } },
      body: { country: "BJ", network: "mtn", msisdn: "+2290190000001" },
    });
    expect(await screen.findByText(/déjà en cours : validez-le sur votre téléphone/)).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();

    // Validé sur le téléphone : un nouvel envoi aboutit, le suivi est relu une fois la commande payée
    POST.mockResolvedValueOnce(respond(201, payment()));
    await user.click(screen.getByRole("button", { name: /^Payer/ }));
    expect(await screen.findByRole("heading", { name: "Paiement réussi !" })).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });
});
