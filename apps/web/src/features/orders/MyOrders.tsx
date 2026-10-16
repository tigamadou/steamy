import type { Schemas } from "@steamy/api-client";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge, type BadgeTone } from "@/components/ds/Badge";
import { Button } from "@/components/ds/Button";
import { Mascot } from "@/components/ds/Mascot";
import { SkeletonBlock } from "@/components/ds/SkeletonBlock";
import { Tabs } from "@/components/ds/Tabs";
import { ProfileBreadcrumb } from "@/features/account/ProfileBreadcrumb";
import { FocusableList } from "@/features/learning/attempts/FocusableList";
import { getPendingRequests } from "@/features/unlock/server";
import { requestAmount, requestTitle, type PaymentRequest } from "@/features/unlock/types";
import { getServerApi } from "@/lib/api";
import { formatInstant } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { routes } from "@/lib/routes";

export const ORDERS_PAGE_SIZE = 10;

type OrderStatus = Schemas["OrderStatusEnum"];

/** Filtres de WD14 dans l'URL (`?statut=`) → statut de commande de l'API ; « Toutes » sans paramètre. */
export const ORDER_FILTERS = {
  payees: { label: "Payées", status: "paid" },
  "en-attente": { label: "En attente", status: "pending" },
  annulees: { label: "Annulées", status: "cancelled" },
} as const satisfies Record<string, { label: string; status: OrderStatus }>;

export type OrderFilter = keyof typeof ORDER_FILTERS;

const KIND_LABELS: Record<Schemas["OrderKindEnum"], string> = { course: "Parcours", kit: "Kit", event: "Événement" };

const STATUS_BADGES: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  paid: { label: "Payée", tone: "success" },
  pending: { label: "En attente de paiement", tone: "amber" },
  cancelled: { label: "Annulée", tone: "neutral" },
  refunded: { label: "Remboursée", tone: "info" },
};

const SHIPPING_LABELS: Record<Schemas["ShippingStatusEnum"], string> = {
  preparing: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
};

/** Ligne commune d'une commande ou d'une demande. */
function Row({
  kind,
  title,
  meta,
  badge,
  amount,
  action,
}: {
  kind: Schemas["OrderKindEnum"];
  title: string;
  meta: string;
  badge: { label: string; tone: BadgeTone };
  amount: string;
  action?: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2.5 rounded-[18px] border-[1.5px] border-ink-100 bg-surface p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="m-0 text-[11px] font-black tracking-[.06em] text-ink-600 uppercase">{KIND_LABELS[kind]}</p>
        <p className="m-0 text-[15px] font-black text-ink-900">{title}</p>
        <p className="m-0 text-[13px] font-semibold text-ink-600">{meta}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 sm:flex-col sm:items-end">
        <Badge tone={badge.tone}>{badge.label}</Badge>
        <p className="m-0 text-base font-black text-ink-900">{amount}</p>
        {action}
      </div>
    </li>
  );
}

function orderRow(order: Schemas["Order"]) {
  const shipping = order.kind === "kit" && order.status === "paid" ? ` · Livraison : ${SHIPPING_LABELS[order.shippingStatus]}` : "";
  return (
    <Row
      key={order.reference}
      kind={order.kind}
      title={order.items.map((item) => item.title).join(", ")}
      meta={`N° ${order.reference} · ${formatInstant(order.createdAt)}${shipping}`}
      badge={STATUS_BADGES[order.status]}
      amount={formatPrice(order.total)}
    />
  );
}

function requestRow(request: PaymentRequest) {
  const title = requestTitle(request);
  return (
    <Row
      key={`demande-${request.id}`}
      kind={request.kind}
      title={title}
      meta={`Demandée le ${formatInstant(request.createdAt)} · à régler avant le ${formatInstant(request.expiresAt)}`}
      badge={{ label: "En attente de ton parent", tone: "amber" }}
      amount={requestAmount(request)}
      action={
        <Link
          href={routes.learner.request(request.id)}
          aria-label={`Voir la demande : ${title}`}
          className="text-sm font-black text-primary-600 hover:underline"
        >
          Voir la demande
        </Link>
      }
    />
  );
}

/**
 * WD14 · Mes commandes : commandes dont l'apprenant est bénéficiaire (payées par son parent), filtrées par statut dans
 * l'URL, et demandes encore à régler « En attente de ton parent » (en tête de la première page). Pas de bouton
 * « Facture » : la facture est adressée au parent payeur (C12). Montants et statuts tels que l'API les renvoie.
 */
export async function MyOrders({ filter, page }: { filter: OrderFilter | null; page: number }) {
  const api = await getServerApi();
  const status = filter ? ORDER_FILTERS[filter].status : undefined;
  const withRequests = page === 1 && (filter === null || filter === "en-attente");
  const [{ data }, requests] = await Promise.all([
    api.GET("/api/payments/orders/", {
      params: { query: { page, pageSize: ORDERS_PAGE_SIZE, ...(status ? { status } : {}) } },
    }),
    withRequests ? getPendingRequests() : Promise.resolve([]),
  ]);
  if (!data) throw new Error("Commandes illisibles");
  const orders = data.results ?? [];
  const empty = orders.length === 0 && requests.length === 0;

  return (
    <div className="flex flex-col gap-4.5">
      <ProfileBreadcrumb current="Mes commandes" />
      <Tabs
        label="Filtrer les commandes"
        activeHref={routes.learner.orderList(filter ?? undefined)}
        items={[
          { href: routes.learner.orderList(), label: "Toutes" },
          ...(Object.keys(ORDER_FILTERS) as OrderFilter[]).map((key) => ({
            href: routes.learner.orderList(key),
            label: ORDER_FILTERS[key].label,
          })),
        ]}
      />
      {empty ? (
        filter === null ? (
          <section aria-labelledby="aucune-commande" className="flex flex-col items-center gap-4 py-8 text-center">
            <Mascot pose="idle" size={130} />
            <h2 id="aucune-commande" className="m-0 text-2xl font-black text-ink-900">
              Aucune commande pour l&apos;instant
            </h2>
            <p className="m-0 max-w-110 text-sm font-semibold text-ink-600">
              Les parcours et les kits que ton parent t&apos;achète apparaîtront ici. Pour en demander un, choisis-le dans
              le catalogue.
            </p>
            <Button href={routes.learner.catalog} iconRight="arrow-right">
              Explorer le catalogue
            </Button>
          </section>
        ) : (
          <p className="m-0 rounded-lg bg-ink-50 p-4 text-sm font-bold text-ink-600">
            Aucune commande « {ORDER_FILTERS[filter].label} » pour l&apos;instant.
          </p>
        )
      ) : (
        <FocusableList changeKey={`${filter}-${page}`} label="Tes commandes">
          {requests.map(requestRow)}
          {orders.map(orderRow)}
        </FocusableList>
      )}
      {(page > 1 || data.next) && (
        <nav aria-label="Pages des commandes" className="flex justify-between gap-3">
          {page > 1 ? (
            <Link
              href={routes.learner.orderList(filter ?? undefined, page - 1)}
              className="text-sm font-black text-primary-600 hover:underline"
            >
              ‹ Plus récentes
            </Link>
          ) : (
            <span />
          )}
          {data.next && (
            <Link
              href={routes.learner.orderList(filter ?? undefined, page + 1)}
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

/** Squelette de WD14 : fil d'Ariane, filtres, lignes. */
export function MyOrdersSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de tes commandes…" className="flex flex-col gap-4.5">
      <SkeletonBlock className="h-4 w-48" />
      <SkeletonBlock className="h-10 w-80 max-w-full rounded-pill" />
      {[0, 1, 2].map((i) => (
        <SkeletonBlock key={i} className="h-24 rounded-[18px]" />
      ))}
    </div>
  );
}
