import type { Metadata } from "next";
import { Suspense } from "react";

import { OrderDetail, OrderDetailSkeleton } from "@/features/parent/orders/OrderDetail";

export const metadata: Metadata = { title: "Commande" };

/** Suivi d'une commande (type WK07) : livraison, Kit Codes, facture, reprise du paiement. */
export default function ParentOrderPage({ params }: PageProps<"/parent/commandes/[reference]">) {
  return (
    <Suspense fallback={<OrderDetailSkeleton />}>
      <OrderDetail params={params} />
    </Suspense>
  );
}
