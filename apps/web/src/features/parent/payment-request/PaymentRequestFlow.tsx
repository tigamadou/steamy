"use client";

import type { Schemas } from "@steamy/api-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, type PaymentFormProps, type PhoneCountry } from "@/components/ds";
import type { PaymentRequest } from "@/features/unlock/types";
import { apiCall, type ApiResult } from "@/lib/api-call";
import { formatInstantTime } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { routes } from "@/lib/routes";

import { DeclineRequestDialog } from "./DeclineRequestDialog";
import { KitAddressStep } from "./KitAddressStep";
import type { ScreenState } from "./messages";
import { OrderPayment } from "./OrderPayment";
import { PaymentRequestSummary } from "./PaymentRequestSummary";

type Order = Pick<
  Schemas["Order"],
  "reference" | "items" | "shippingFee" | "taxes" | "total" | "deliveryZone" | "deliveryAddress" | "expiresAt"
>;
type EventInfo = NonNullable<Parameters<typeof PaymentRequestSummary>[0]["event"]>;
type Child = Parameters<typeof PaymentRequestSummary>[0]["child"];

export type PaymentRequestFlowProps = {
  request: PaymentRequest;
  child: Child;
  requiredKit: Schemas["RequiredKit"] | null;
  /** Commande en attente de la demande (`pendingOrderReference`), reprise telle quelle. */
  order: Order | null;
  /** Événement d'une demande d'événement (date et lieu), lu sur la fiche de l'événement de la commande. */
  event?: EventInfo | null;
  /** Adresse par défaut (WPD08) et pays de la localité, pour une demande de kit. */
  address: Schemas["DeliveryAddress"] | null;
  defaultCountry: string;
  parentName: string;
  countries: PhoneCountry[];
  preferred: PaymentFormProps["preferred"];
};

/** Adresse de livraison de la commande créée, avec « Modifier » (nouvelle commande au prochain envoi). */
function AddressRecap({ order, onEdit, locked }: { order: Order; onEdit: () => void; locked: boolean }) {
  const address = order.deliveryAddress;
  return (
    <div className="flex items-start gap-3 rounded-[14px] border-2 border-ink-100 p-3.5">
      <span aria-hidden className="text-lg">
        🚚
      </span>
      <div className="min-w-0 flex-1 text-[13px] leading-normal font-bold text-ink-700">
        <p className="m-0 font-black text-ink-900">Adresse de livraison</p>
        {address && (
          <p className="m-0">
            {address.recipientName} · {[address.district, address.addressLine].filter(Boolean).join(", ")}, {address.city}
          </p>
        )}
        {order.deliveryZone && (
          <p className="m-0">
            Zone : {order.deliveryZone.name} · {order.deliveryZone.delayLabel}
          </p>
        )}
        <p className="m-0 mt-1 text-ink-600">
          Kit réservé jusqu&apos;au <time dateTime={order.expiresAt}>{formatInstantTime(order.expiresAt)}</time>.
        </p>
      </div>
      {!locked && (
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Modifier<span className="sr-only"> l&apos;adresse de livraison</span>
        </Button>
      )}
    </div>
  );
}

/**
 * WPD15 · demande de paiement en attente : objet et montants du serveur, adresse d'un kit (commande créée au passage
 * au paiement, C10), `PaymentForm` puis `PaymentStatusPanel`, kit en rupture (paiement impossible, refus proposé),
 * « Refuser la demande » (motif facultatif).
 */
export function PaymentRequestFlow(props: PaymentRequestFlowProps) {
  const { request, child, requiredKit, event, address, defaultCountry, parentName, countries, preferred } = props;
  const router = useRouter();
  const isKit = request.kind === "kit";
  const [order, setOrder] = useState<Order | null>(props.order);
  const [editing, setEditing] = useState(isKit && !props.order);
  const [state, setState] = useState<ScreenState>("pending");
  const [notice, setNotice] = useState<string>();
  const [declining, setDeclining] = useState(false);
  const title = request.course?.title ?? request.items.map((item) => item.title).join(", ");
  const settling = state === "confirming" || state === "paid" || state === "refunded";

  /** Référence de la commande à payer : celle en cours, sinon une commande créée pour la demande (parcours). */
  async function reference(): Promise<ApiResult<string>> {
    if (order) return { ok: true, data: order.reference };
    const result = await apiCall((api) =>
      api.POST("/api/payments/orders/", { body: { paymentRequestId: request.id } }),
    );
    if (!result.ok) {
      if (result.code === "PAYMENT_REQUEST_CLOSED") router.refresh();
      return result;
    }
    setOrder(result.data);
    return { ok: true, data: result.data.reference };
  }

  function orderClosed(code: "ORDER_EXPIRED" | "ORDER_ALREADY_PAID") {
    if (code === "ORDER_ALREADY_PAID") {
      router.refresh();
      return;
    }
    setOrder(null);
    if (isKit) {
      setEditing(true);
      setNotice("Le délai de réservation est dépassé : confirmez l'adresse pour réserver de nouveau le kit.");
    }
  }

  const success = {
    message: isKit ? (
      <p className="m-0">
        Votre commande est confirmée : vous pouvez suivre la livraison du kit dans vos commandes. {child.firstName} a été
        prévenu·e.
      </p>
    ) : request.kind === "event" ? (
      <p className="m-0">
        Votre place à <strong>{title}</strong> est confirmée pour {child.firstName}. {child.firstName} a été prévenu·e.
      </p>
    ) : (
      <p className="m-0">
        Le parcours <strong>{title}</strong> est débloqué pour {child.firstName}.
      </p>
    ),
    action: { label: "Retour à l'accueil", href: routes.parent.home },
  };

  let panel;
  if (state === "outofstock") {
    panel = (
      <div role="alert" className="flex flex-col gap-4 rounded-[22px] border-2 border-amber-300 bg-surface p-5">
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex size-12 items-center justify-center rounded-[14px] bg-amber-100 text-2xl">
            📭
          </span>
          <h2 className="m-0 text-lg font-black text-ink-900">Kit en rupture de stock</h2>
        </div>
        <p className="m-0 text-sm leading-normal font-semibold text-ink-700">
          <strong>{title}</strong> n&apos;est plus disponible pour le moment : le paiement est impossible. Vous pouvez
          refuser la demande ; {child.firstName} en sera informé·e et pourra la renvoyer quand le kit sera de retour.
        </p>
        <Button block variant="danger" onClick={() => setDeclining(true)}>
          Refuser la demande
        </Button>
      </div>
    );
  } else if (isKit && editing) {
    panel = (
      <div className="flex flex-col gap-3 rounded-[22px] border-2 border-ink-100 bg-surface p-4 sm:p-5.5">
        <h2 className="m-0 text-lg font-black text-ink-900">Livraison du kit</h2>
        {notice && (
          <p role="status" className="m-0 rounded-[14px] bg-amber-50 px-4 py-3 text-sm font-bold text-ink-700">
            {notice}
          </p>
        )}
        <KitAddressStep
          createOrder={(deliveryAddress) =>
            apiCall((api) =>
              api.POST("/api/payments/orders/", { body: { paymentRequestId: request.id, deliveryAddress } }),
            )
          }
          address={address}
          defaultCountry={defaultCountry}
          recipientName={parentName}
          onOrder={(created) => {
            setOrder(created);
            setEditing(false);
            setNotice(undefined);
          }}
          onOutOfStock={() => setState("outofstock")}
        />
      </div>
    );
  } else {
    panel = (
      <OrderPayment
        amount={order?.total ?? request.total}
        reference={reference}
        countries={countries}
        preferred={preferred}
        success={success}
        onOrderClosed={orderClosed}
        onState={setState}
      />
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
      <PaymentRequestSummary
        request={request}
        child={child}
        state={state}
        requiredKit={requiredKit}
        order={order}
        event={event}
        address={
          isKit && order && !editing ? (
            <AddressRecap order={order} locked={settling} onEdit={() => setEditing(true)} />
          ) : undefined
        }
      />
      <div className="flex flex-col gap-3">
        {panel}
        {!settling && state !== "outofstock" && (
          <Button variant="ghost" className="self-center text-error-700!" onClick={() => setDeclining(true)}>
            Refuser la demande
          </Button>
        )}
      </div>
      <DeclineRequestDialog
        open={declining}
        onClose={() => setDeclining(false)}
        requestId={request.id}
        childFirstName={child.firstName}
        summary={`${request.kind === "kit" ? "Kit" : "Parcours"} ${title} · ${formatPrice(order?.total ?? request.total)}`}
        onDeclined={() => {
          setDeclining(false);
          router.refresh();
        }}
      />
    </div>
  );
}
