import Link from "next/link";

import { Button, Mascot, SkeletonBlock, Tabs } from "@/components/ds";
import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";
import { routes } from "@/lib/routes";

import { OrderRow } from "./OrderRow";
import { ORDER_FILTERS, parseOrderFilter, type OrderFilter } from "./status";

/** Commandes par page de WPD07. */
export const ORDERS_PAGE_SIZE = 10;

type SearchParams = Record<string, string | string[] | undefined>;

/** Page lue dans l'URL, la première sinon. */
export function parsePage(value: string | string[] | undefined): number {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(page) && page > 1 ? page : 1;
}

/**
 * WPD07 · commandes du parent payeur (une commande dont il n'est pas payeur n'est pas listée, côté API), filtrées par
 * statut dans l'URL (`?statut=`), paginées ; « Acheter un kit » mène à la boutique de son espace (C10).
 */
export async function ParentOrders({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = await searchParams;
  const filter = parseOrderFilter(query.statut);
  const page = parsePage(query.page);
  const api = await getServerApi();
  const data = readOrNull(
    await api.GET("/api/payments/orders/", {
      params: {
        query: { page, pageSize: ORDERS_PAGE_SIZE, ...(filter ? { status: ORDER_FILTERS[filter].status } : {}) },
      },
    }),
  );
  if (!data) return null;
  const orders = data.results ?? [];

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label="Filtrer les commandes"
          activeHref={routes.parent.orderList(filter ?? undefined)}
          items={[
            { href: routes.parent.orderList(), label: "Toutes" },
            ...(Object.keys(ORDER_FILTERS) as OrderFilter[]).map((key) => ({
              href: routes.parent.orderList(key),
              label: ORDER_FILTERS[key].label,
            })),
          ]}
        />
        <Button size="sm" icon="cart" href={routes.parent.shop}>
          Acheter un kit
        </Button>
      </div>
      {orders.length === 0 ? (
        filter === null ? (
          <section aria-labelledby="aucune-commande" className="flex flex-col items-center gap-4 py-8 text-center">
            <Mascot pose="idle" size={130} />
            <h2 id="aucune-commande" className="m-0 text-2xl font-black text-ink-900">
              Aucune commande pour l&apos;instant
            </h2>
            <p className="m-0 max-w-110 text-sm font-semibold text-ink-600">
              Les parcours, kits et événements que vous réglez apparaîtront ici, avec leurs factures.
            </p>
            <Button href={routes.parent.shop} iconRight="arrow-right">
              Voir la boutique de kits
            </Button>
          </section>
        ) : (
          <p className="m-0 rounded-lg bg-ink-50 p-4 text-sm font-bold text-ink-600">
            Aucune commande « {ORDER_FILTERS[filter].label} » pour l&apos;instant.
          </p>
        )
      ) : (
        <ul aria-label="Mes commandes" className="m-0 flex list-none flex-col gap-3 p-0">
          {orders.map((order) => (
            <li key={order.reference}>
              <OrderRow order={order} />
            </li>
          ))}
        </ul>
      )}
      {(page > 1 || data.next) && (
        <nav aria-label="Pages des commandes" className="flex justify-between gap-3">
          {page > 1 ? (
            <Link
              href={routes.parent.orderList(filter ?? undefined, page - 1)}
              className="text-sm font-black text-primary-600 hover:underline"
            >
              ‹ Plus récentes
            </Link>
          ) : (
            <span />
          )}
          {data.next && (
            <Link
              href={routes.parent.orderList(filter ?? undefined, page + 1)}
              className="text-sm font-black text-primary-600 hover:underline"
            >
              Plus anciennes ›
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

/** Squelette de WPD07. */
export function ParentOrdersSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de vos commandes…" className="flex flex-col gap-4.5">
      <SkeletonBlock className="h-10 w-96 max-w-full rounded-pill" />
      {[0, 1, 2].map((i) => (
        <SkeletonBlock key={i} className="h-24 rounded-[18px]" />
      ))}
    </div>
  );
}
