"use client";

import type { Schemas } from "@steamy/api-client";
import { useState } from "react";

import {
  Button,
  Field,
  Select,
  SkeletonBlock,
  WKSummaryRow,
  type PaymentFormProps,
  type PhoneCountry,
} from "@/components/ds";
import { orderItems } from "@/features/checkout/CheckoutGate";
import { KitAddressStep } from "@/features/parent/payment-request/KitAddressStep";
import { OrderPayment } from "@/features/parent/payment-request/OrderPayment";
import { useCart } from "@/features/shop/use-cart";
import { apiCall } from "@/lib/api-call";
import { formatInstantTime } from "@/lib/dates";
import { formatPrice, quantityLabel } from "@/lib/format";
import { routes } from "@/lib/routes";

type Order = Schemas["OrderCreated"];
type Kid = Pick<Schemas["Child"], "id" | "firstName" | "lastName">;

export type ParentKitCheckoutProps = {
  /** Adresse par défaut (WPD08) et pays de la localité du parent. */
  address: Schemas["DeliveryAddress"] | null;
  defaultCountry: string;
  parentName: string;
  /** Enfants actifs, bénéficiaires possibles (facultatif). */
  kids: Kid[];
  countries: PhoneCountry[];
  preferred: PaymentFormProps["preferred"];
  /** Commande de kit déjà en attente de paiement (rechargement, autre onglet) : reprise proposée avant d'en créer une autre. */
  pendingOrder?: Pick<Schemas["Order"], "reference" | "expiresAt"> | null;
};

/**
 * Achat direct de kit par le parent (C10, WK05 et WK06 au vouvoiement) : enfant bénéficiaire facultatif, adresse de
 * livraison préremplie (WPD08), commande qui réserve le stock 30 minutes et calcule frais et total (serveur, D37,
 * D38), puis paiement Mobile Money (formulaire de WPD15). Les kits payés quittent le panier (API).
 */
export function ParentKitCheckout(props: ParentKitCheckoutProps) {
  const { address, defaultCountry, parentName, kids, countries, preferred, pendingOrder } = props;
  const { state, reload } = useCart("parent", "vous");
  const [beneficiary, setBeneficiary] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [notice, setNotice] = useState<string>();
  // Commande payée entre-temps (autre onglet) : ses kits ont quitté le panier, l'avis ne dépend donc pas du panier
  const [paid, setPaid] = useState<string | null>(null);
  const [newOrder, setNewOrder] = useState(false);

  if (paid) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-[22px] bg-success-50 px-6 py-10 text-center">
        <p className="m-0 text-base font-black text-ink-900">Cette commande est déjà payée.</p>
        <Button href={routes.parent.order(paid)}>Suivre ma commande</Button>
      </div>
    );
  }
  if (pendingOrder && !order && !newOrder) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-[22px] bg-amber-50 px-6 py-10 text-center">
        <p className="m-0 text-base font-black text-ink-900">Une commande de kit attend déjà votre paiement.</p>
        <p className="m-0 text-sm font-bold text-ink-700">
          Commande {pendingOrder.reference}, réservée jusqu&apos;au{" "}
          <time dateTime={pendingOrder.expiresAt}>{formatInstantTime(pendingOrder.expiresAt)}</time> : payez-la plutôt
          que d&apos;en passer une seconde.
        </p>
        <Button href={routes.parent.order(pendingOrder.reference)}>Reprendre le paiement</Button>
        <Button variant="ghost" onClick={() => setNewOrder(true)}>
          Passer une nouvelle commande
        </Button>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div role="status" aria-busy="true" aria-label="Chargement de votre commande…" className="flex flex-col gap-4">
        <SkeletonBlock className="h-24 rounded-[22px]" />
        <SkeletonBlock className="h-80 rounded-[22px]" />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-[22px] bg-ink-50 px-6 py-10 text-center">
        <p className="m-0 text-base font-black text-ink-900">{state.message}</p>
        <Button variant="outline" onClick={reload}>
          Réessayer
        </Button>
      </div>
    );
  }
  const unavailable = state.lines.some((line) => !line.kit.available);
  if (!order && (state.lines.length === 0 || unavailable)) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-[22px] bg-ink-50 px-6 py-10 text-center">
        <p className="m-0 text-base font-black text-ink-900">
          {state.lines.length === 0
            ? "Votre panier est vide."
            : "Un kit de votre panier n'est plus disponible : retirez-le avant de commander."}
        </p>
        <Button href={state.lines.length === 0 ? routes.parent.shop : routes.parent.cart}>
          {state.lines.length === 0 ? "Voir la boutique" : "Retour au panier"}
        </Button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto flex w-full max-w-180 flex-col gap-4">
        <section aria-labelledby="commande-kits" className="rounded-[22px] border-2 border-ink-100 bg-surface p-4 sm:p-5.5">
          <h2 id="commande-kits" className="m-0 mb-2 text-lg font-black text-ink-900">
            Votre panier
          </h2>
          <dl className="m-0 flex flex-col gap-1.5">
            {state.lines.map((line) => (
              <WKSummaryRow
                key={line.kit.slug}
                label={quantityLabel(line.kit.name, line.quantity)}
                value={formatPrice(line.total)}
              />
            ))}
            <WKSummaryRow label="Sous-total hors livraison" value={formatPrice(state.subtotal)} />
          </dl>
          {kids.length > 0 && (
            <Field
              label="Pour quel enfant ? (facultatif)"
              hint="Il recevra les Kit Codes du kit pour débloquer ses parcours."
              className="mt-4"
            >
              <Select value={beneficiary} onChange={(event) => setBeneficiary(event.target.value)}>
                <option value="">Pour la famille</option>
                {kids.map((kid) => (
                  <option key={kid.id} value={kid.id}>
                    {kid.firstName} {kid.lastName}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </section>
        {notice && (
          <p role="alert" className="m-0 rounded-[14px] bg-amber-50 px-4 py-3 text-sm font-bold text-ink-800">
            {notice}
          </p>
        )}
        <KitAddressStep
          createOrder={(deliveryAddress) =>
            apiCall((api) =>
              api.POST("/api/payments/orders/", {
                body: {
                  kind: "kit",
                  items: orderItems(state),
                  deliveryAddress,
                  ...(beneficiary ? { beneficiaryId: Number(beneficiary) } : {}),
                },
              }),
            )
          }
          address={address}
          defaultCountry={defaultCountry}
          recipientName={parentName}
          onOrder={(created) => {
            setNotice(undefined);
            setOrder(created);
          }}
          onOutOfStock={() => {
            setNotice("Un kit vient d'être épuisé : votre panier a été relu, vérifiez-le avant de commander.");
            reload();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-4">
      <section aria-labelledby="total-commande" className="rounded-[22px] bg-primary-50 p-5">
        <h2 id="total-commande" className="m-0 text-sm font-extrabold text-primary-800">
          Commande {order.reference}
        </h2>
        <p className="m-0 mt-1 text-[32px] font-black text-primary-700">{formatPrice(order.total)}</p>
        <dl className="m-0 mt-3 flex flex-col gap-1.5">
          {order.items.map((item) => (
            <WKSummaryRow
              key={item.id}
              label={quantityLabel(item.title, item.quantity)}
              value={formatPrice(item.total)}
            />
          ))}
          <WKSummaryRow
            label={order.deliveryZone ? `Livraison (${order.deliveryZone.name})` : "Livraison"}
            value={formatPrice(order.shippingFee)}
          />
        </dl>
        <p className="m-0 mt-3 text-[13px] font-bold text-ink-700">
          Vos kits sont réservés jusqu&apos;au <time dateTime={order.expiresAt}>{formatInstantTime(order.expiresAt)}</time>{" "}
          : payez avant cette heure.
        </p>
      </section>
      <OrderPayment
        amount={order.total}
        reference={async () => ({ ok: true, data: order.reference })}
        countries={countries}
        preferred={preferred}
        success={{
          message: <p className="m-0">Votre commande est confirmée : suivez sa livraison et retrouvez ses Kit Codes.</p>,
          action: { label: "Suivre ma commande", href: routes.parent.order(order.reference) },
        }}
        onOrderClosed={(code) => {
          if (code === "ORDER_ALREADY_PAID") {
            setPaid(order.reference);
            return;
          }
          setOrder(null);
          setNotice("Le délai de réservation est dépassé : confirmez de nouveau l'adresse pour réserver vos kits.");
          reload();
        }}
      />
    </div>
  );
}
