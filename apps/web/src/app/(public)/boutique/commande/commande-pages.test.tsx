import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/checkout/steps", () => ({ GuestStep: () => <p>WK04</p>, DeliveryStep: () => <p>WK05</p> }));
vi.mock("@/features/checkout/PaymentStep", () => ({ PaymentStep: () => <p>WK06</p> }));
vi.mock("@/features/checkout/OrderTracking", () => ({
  OrderTracking: ({ reference }: { reference: string }) => <p>{`WK07 ${reference}`}</p>,
}));

const guestPage = await import("./coordonnees/page");
const deliveryPage = await import("./livraison/page");
const paymentPage = await import("./paiement/page");
const orderPage = await import("../commandes/[reference]/page");

const NOINDEX = { index: false, follow: false };

describe("tunnel invité (D12)", () => {
  it.each([
    [guestPage, "Vos coordonnées", "WK04"],
    [deliveryPage, "Où livrer votre commande ?", "WK05"],
    [paymentPage, "Paiement Mobile Money", "WK06"],
  ])("étape non indexée avec son titre", (page, title, content) => {
    render(page.default());
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText(content)).toBeInTheDocument();
    expect(page.metadata.robots).toEqual(NOINDEX);
  });

  it("WK07 : référence lue dans l'URL, page non indexée et sans référent", async () => {
    expect(orderPage.metadata).toMatchObject({ robots: NOINDEX, referrer: "no-referrer" });
    const tree = orderPage.default({ params: Promise.resolve({ reference: "KT-1" }) } as never) as ReactElement<{
      children: ReactElement<{ children: ReactElement<{ params: Promise<unknown> }> }>;
    }>;
    const tracking = tree.props.children.props.children;
    render(await (tracking.type as (props: unknown) => Promise<ReactElement>)(tracking.props));
    expect(screen.getByText("WK07 KT-1")).toBeInTheDocument();
  });
});
