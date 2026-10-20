import type { Metadata } from "next";

import { CheckoutFrame } from "@/features/checkout/CheckoutFrame";
import { PaymentStep } from "@/features/checkout/PaymentStep";

export const metadata: Metadata = { title: "Paiement", robots: { index: false, follow: false } };

/** WK06 / WK09 · Paiement Mobile Money de la commande invitée, dans le shell public. */
export default function PaymentPage() {
  return (
    <CheckoutFrame step={3} title="Paiement Mobile Money">
      <PaymentStep />
    </CheckoutFrame>
  );
}
