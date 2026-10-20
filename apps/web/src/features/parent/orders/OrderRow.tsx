import type { Schemas } from "@steamy/api-client";

import { Badge, Button } from "@/components/ds";
import { formatInstant } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { routes } from "@/lib/routes";

import { InvoiceButton } from "./InvoiceButton";
import { KIND_ICONS, ORDER_STATUS, SHIPPING_LABELS } from "./status";

type Order = Schemas["Order"];

/** Libellé d'une commande : ses articles, tels que l'API les nomme. */
export function orderTitle(order: Pick<Order, "items">): string {
  return order.items.map((item) => (item.quantity > 1 ? `${item.title} × ${item.quantity}` : item.title)).join(", ");
}

/**
 * Ligne de WPD07 : pictogramme selon `kind` (D37), libellé, bénéficiaire, référence, date, montant, statut (4 états) et,
 * pour un kit payé, l'état de la livraison. Actions : « Facture » (payée, payeur seul, C12), « Payer » (en attente),
 * « Suivre » (kit) ; le détail de la commande reprend le paiement et liste les Kit Codes (C10).
 */
export function OrderRow({ order }: { order: Order }) {
  const kind = KIND_ICONS[order.kind];
  const status = ORDER_STATUS[order.status];
  const title = orderTitle(order);
  const meta = [
    order.beneficiary ? `Pour ${order.beneficiary.firstName}` : null,
    `N° ${order.reference}`,
    formatInstant(order.createdAt),
    order.kind === "kit" && order.status === "paid" ? `Livraison : ${SHIPPING_LABELS[order.shippingStatus]}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <article
      aria-label={`${kind.label} : ${title}`}
      className="flex flex-col gap-3 rounded-[18px] border-[1.5px] border-ink-100 bg-surface p-4 sm:flex-row sm:items-center"
    >
      <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-primary-50 text-2xl">
        {kind.icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="m-0 text-[11px] font-black tracking-[.06em] text-ink-600 uppercase">{kind.label}</p>
        <p className="m-0 text-[15px] font-black text-ink-900">{title}</p>
        <p className="m-0 text-[13px] font-semibold text-ink-600">{meta}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 sm:flex-col sm:items-end">
        <Badge tone={status.tone}>{status.label}</Badge>
        <p className="m-0 text-base font-black text-ink-900">{formatPrice(order.total)}</p>
        <div className="flex flex-wrap gap-2">
          {order.status === "paid" && <InvoiceButton reference={order.reference} />}
          {order.status === "pending" && (
            <Button size="sm" href={routes.parent.order(order.reference)}>
              Payer<span className="sr-only"> la commande {order.reference}</span>
            </Button>
          )}
          {order.kind === "kit" && order.status !== "pending" && (
            <Button size="sm" variant="ghost" href={routes.parent.order(order.reference)}>
              Suivre<span className="sr-only"> la commande {order.reference}</span>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
