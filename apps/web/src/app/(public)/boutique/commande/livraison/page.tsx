import type { Metadata } from "next";

import { CheckoutFrame } from "@/features/checkout/CheckoutFrame";
import { DeliveryStep } from "@/features/checkout/steps";

export const metadata: Metadata = { title: "Livraison", robots: { index: false, follow: false } };

/** WK05 · Adresse et zone de livraison de l'invité ; la commande est créée en continuant vers le paiement. */
export default function DeliveryPage() {
  return (
    <CheckoutFrame step={2} title="Où livrer votre commande ?">
      <DeliveryStep />
    </CheckoutFrame>
  );
}
