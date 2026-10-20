import { notFound } from "next/navigation";

import { Badge, Breadcrumb, ShippingTimeline, SkeletonBlock, WKSummaryRow } from "@/components/ds";
import { closedOrderNote } from "@/features/checkout/order-status";
import { shippingSteps } from "@/features/checkout/shipping";
import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";
import { formatInstant, formatInstantTime } from "@/lib/dates";
import { formatPrice, quantityLabel } from "@/lib/format";
import { getCountries } from "@/lib/referentials";
import { routes } from "@/lib/routes";

import { InvoiceLink } from "./InvoiceLink";
import { KitCodeList } from "./KitCodeList";
import { orderTitle } from "./OrderRow";
import { PendingOrderPayment } from "./PendingOrderPayment";
import { KIND_ICONS, ORDER_STATUS } from "./status";

/**
 * Suivi d'une commande du parent (type WK07, C10) : statut, articles et montants du serveur, adresse et frise de
 * livraison d'un kit, Kit Codes (payeur seul), facture (payée), reprise du paiement (en attente). Une commande dont le
 * parent n'est pas payeur répond 404 : « Commande introuvable ».
 */
export async function OrderDetail({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const api = await getServerApi();
  const response = await api.GET("/api/payments/orders/{reference}/", { params: { path: { reference } } });
  if (response.response.status === 404) notFound();
  const order = readOrNull(response);
  if (!order) return null;
  const kind = KIND_ICONS[order.kind];
  const status = ORDER_STATUS[order.status];
  const pending = order.status === "pending";
  const [countries, profile] = pending
    ? await Promise.all([getCountries(), api.GET("/api/accounts/me/parent-profile/")])
    : [[], null];
  const kitNames = Object.fromEntries(order.items.filter((item) => item.kitSlug).map((item) => [item.kitSlug, item.title]));
  const address = order.deliveryAddress;

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb items={[{ label: "Commandes", href: routes.parent.orders }, { label: order.reference }]} />
      <div className={pending ? "grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]" : "mx-auto w-full max-w-190"}>
        <div className="flex min-w-0 flex-col gap-5">
          <section
            aria-labelledby="commande-titre"
            className="flex flex-col gap-3 rounded-[22px] border-2 border-ink-100 bg-surface p-4 sm:p-5.5"
          >
            <div className="flex items-center gap-3">
              <span aria-hidden className="text-3xl">
                {kind.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[11px] font-black tracking-[.06em] text-ink-600 uppercase">
                  {kind.label} · N° {order.reference}
                </p>
                <h2 id="commande-titre" className="m-0 text-lg font-black text-ink-900">
                  {orderTitle(order)}
                </h2>
              </div>
              <Badge tone={status.tone}>{status.label}</Badge>
            </div>
            <p className="m-0 text-[13px] font-bold text-ink-600">
              Passée le <time dateTime={order.createdAt}>{formatInstant(order.createdAt)}</time>
              {order.beneficiary && <> · pour {order.beneficiary.firstName}</>}
              {order.paidAt && (
                <>
                  {" "}
                  · payée le <time dateTime={order.paidAt}>{formatInstant(order.paidAt)}</time>
                </>
              )}
            </p>
            <dl className="m-0 flex flex-col gap-1.5 border-t-2 border-dashed border-ink-100 pt-2.5">
              {order.items.map((item) => (
                <WKSummaryRow
                  key={item.id}
                  label={quantityLabel(item.title, item.quantity)}
                  value={formatPrice(item.total)}
                />
              ))}
              {order.kind === "kit" && (
                <WKSummaryRow
                  label={order.deliveryZone ? `Livraison (${order.deliveryZone.name})` : "Livraison"}
                  value={formatPrice(order.shippingFee)}
                />
              )}
              <WKSummaryRow label="Total" value={formatPrice(order.total)} />
            </dl>
            {address && (
              <p className="m-0 text-[13px] font-semibold text-ink-700">
                🚚 {address.recipientName} · {[address.district, address.addressLine].filter(Boolean).join(", ")},{" "}
                {address.city}
              </p>
            )}
            {(order.status === "refunded" || order.status === "cancelled") && (
              <p className="m-0 rounded-[14px] bg-ink-50 px-4 py-3 text-[13px] font-bold text-ink-700">
                {closedOrderNote(order.status)}
              </p>
            )}
            {order.status === "paid" && (
              <div className="self-start">
                <InvoiceLink reference={order.reference} invoice={order.invoice} label="Télécharger la facture" />
              </div>
            )}
          </section>
          {order.kind === "kit" && order.status === "paid" && (
            <section aria-labelledby="livraison-titre" className="rounded-[22px] border-2 border-ink-100 bg-surface p-4 sm:p-5.5">
              <h2 id="livraison-titre" className="m-0 mb-3 text-lg font-black text-ink-900">
                Livraison
              </h2>
              <ShippingTimeline steps={shippingSteps(order)} />
            </section>
          )}
          {order.kitCodes.length > 0 && <KitCodeList codes={order.kitCodes} kitNames={kitNames} />}
        </div>
        {pending && (
          <aside aria-label="Paiement" className="flex flex-col gap-3">
            <p className="m-0 rounded-[14px] bg-amber-50 px-4 py-3 text-[13px] font-bold text-ink-700">
              À payer avant le <time dateTime={order.expiresAt}>{formatInstantTime(order.expiresAt)}</time> : passé ce
              délai, la commande est annulée.
            </p>
            <PendingOrderPayment
              reference={order.reference}
              total={order.total}
              countries={countries}
              preferred={profile?.data?.mobileMoney ?? null}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

/** Squelette du suivi d'une commande. */
export function OrderDetailSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de la commande…" className="flex flex-col gap-5">
      <SkeletonBlock className="h-4 w-48" />
      <SkeletonBlock className="h-64 rounded-[22px]" />
      <SkeletonBlock className="h-48 rounded-[22px]" />
    </div>
  );
}
