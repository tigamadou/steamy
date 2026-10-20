import type { Metadata } from "next";
import { Suspense } from "react";

import { CartView } from "@/features/shop/CartView";
import { DeliveryZonesSlot } from "@/features/shop/DeliveryZonesSlot";

export const metadata: Metadata = { title: "Mon panier" };

/** WK03 / WK10 dans l'espace parent : panier serveur (D38), « Commander » → livraison et paiement. */
export default function ParentCartPage() {
  return (
    <CartView
      context="parent"
      zones={
        <Suspense fallback={null}>
          <DeliveryZonesSlot register="vous" />
        </Suspense>
      }
    />
  );
}
