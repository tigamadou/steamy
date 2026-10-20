import type { Metadata } from "next";
import { Suspense } from "react";

import { ParentKitCheckoutScreen, ParentKitCheckoutSkeleton } from "@/features/parent/shop/ParentKitCheckoutScreen";

export const metadata: Metadata = { title: "Commande de kits" };

/** Achat direct de kit (C10) : livraison puis paiement, dans l'espace parent. */
export default function ParentCheckoutPage() {
  return (
    <Suspense fallback={<ParentKitCheckoutSkeleton />}>
      <ParentKitCheckoutScreen />
    </Suspense>
  );
}
