import type { Metadata } from "next";
import { Suspense } from "react";

import { ParentOrders, ParentOrdersSkeleton } from "@/features/parent/orders/ParentOrders";

export const metadata: Metadata = { title: "Commandes" };

/** WPD07 · commandes du parent (`?statut=`, `?page=`). */
export default function ParentOrdersPage({ searchParams }: PageProps<"/parent/commandes">) {
  return (
    <Suspense fallback={<ParentOrdersSkeleton />}>
      <ParentOrders searchParams={searchParams} />
    </Suspense>
  );
}
