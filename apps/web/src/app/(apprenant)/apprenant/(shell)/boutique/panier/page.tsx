import type { Metadata } from "next";
import { Suspense } from "react";

import { DeliveryZonesSlot } from "@/features/shop/DeliveryZonesSlot";
import { LearnerCart } from "@/features/unlock/LearnerCart";

export const metadata: Metadata = { title: "Mon panier" };

/**
 * WK03 / WK10 · Panier de l'apprenant, côté serveur (D38) ; le panier invité y est versé au retour de la connexion.
 * « Demander à mon parent » crée la demande de kit et ouvre WK08.
 */
export default function LearnerCartPage() {
  return (
    <LearnerCart
      zones={
        <Suspense fallback={null}>
          <DeliveryZonesSlot register="tu" />
        </Suspense>
      }
    />
  );
}
