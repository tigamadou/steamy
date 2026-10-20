import type { Metadata } from "next";
import { Suspense } from "react";

import { CartView } from "@/features/shop/CartView";
import { DeliveryZonesSlot } from "@/features/shop/DeliveryZonesSlot";

export const metadata: Metadata = { title: "Mon panier" };

/**
 * WK03 / WK10 · Panier de l'apprenant, côté serveur (D38) ; le panier invité y est versé au retour de la connexion.
 * « Demander à mon parent » (WK08) arrive avec l'étape 3.7c.
 */
export default function LearnerCartPage() {
  return (
    <CartView
      context="learner"
      zones={
        <Suspense fallback={null}>
          <DeliveryZonesSlot register="tu" />
        </Suspense>
      }
    />
  );
}
