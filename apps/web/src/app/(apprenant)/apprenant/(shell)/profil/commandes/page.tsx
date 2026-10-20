import type { Metadata } from "next";
import { Suspense } from "react";

import { MyOrders, MyOrdersSkeleton, ORDER_FILTERS, type OrderFilter } from "@/features/orders/MyOrders";

export const metadata: Metadata = { title: "Mes commandes" };

/** Filtre de l'URL (`?statut=`), ignoré s'il n'est pas connu. */
function filterOf(value: string | string[] | undefined): OrderFilter | null {
  return typeof value === "string" && Object.hasOwn(ORDER_FILTERS, value) ? (value as OrderFilter) : null;
}

/** Page (`?page=`), 1 par défaut. */
function pageOf(value: string | string[] | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 1 ? page : 1;
}

// WD14 · Mes commandes (titre du header : « Mes commandes »).
export default async function OrdersPage({ searchParams }: PageProps<"/apprenant/profil/commandes">) {
  const { statut, page } = await searchParams;
  const filter = filterOf(statut);
  const current = pageOf(page);
  return (
    <Suspense key={`${filter}-${current}`} fallback={<MyOrdersSkeleton />}>
      <MyOrders filter={filter} page={current} />
    </Suspense>
  );
}
