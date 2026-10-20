import type { Metadata } from "next";

import { CheckoutFrame } from "@/features/checkout/CheckoutFrame";
import { GuestStep } from "@/features/checkout/steps";

export const metadata: Metadata = { title: "Vos coordonnées", robots: { index: false, follow: false } };

/** WK04 · Coordonnées de l'invité (D12), dans le shell public. */
export default function GuestInfoPage() {
  return (
    <CheckoutFrame step={1} title="Vos coordonnées">
      <GuestStep />
    </CheckoutFrame>
  );
}
