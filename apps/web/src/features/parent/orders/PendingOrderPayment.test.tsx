import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const OrderPayment = vi.fn<(props: Record<string, unknown>) => null>(() => null);
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/features/parent/payment-request/OrderPayment", () => ({
  OrderPayment: (props: Record<string, unknown>) => OrderPayment(props),
}));

const { PendingOrderPayment } = await import("./PendingOrderPayment");

describe("PendingOrderPayment (WPD07, reprise du paiement)", () => {
  beforeEach(() => {
    refresh.mockClear();
    OrderPayment.mockClear();
  });

  it("reprend la commande existante, renvoie vers les commandes et rafraîchit si elle est close", async () => {
    const preferred = { country: "BJ", network: "mtn", phone: "+2290190000001" };
    render(<PendingOrderPayment reference="CMD-ABC123" total={25000} countries={[]} preferred={preferred} />);
    const props = OrderPayment.mock.calls[0][0] as {
      amount: number;
      reference: () => Promise<unknown>;
      preferred: unknown;
      success: { action: { label: string; href: string } };
      onOrderClosed: () => void;
    };
    expect(props).toMatchObject({ amount: 25000, preferred, countries: [] });
    await expect(props.reference()).resolves.toEqual({ ok: true, data: "CMD-ABC123" });
    expect(props.success.action).toEqual({ label: "Voir mes commandes", href: "/parent/commandes" });
    props.onOrderClosed();
    expect(refresh).toHaveBeenCalled();
  });
});
