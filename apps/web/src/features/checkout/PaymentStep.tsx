"use client";

import type { Schemas } from "@steamy/api-client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  Button,
  Loader,
  PaymentForm,
  PaymentStatusPanel,
  SkeletonBlock,
  TaxRows,
  WKSummaryRow,
  type PaymentFormValues,
} from "@/components/ds";
import { writeGuestCart } from "@/features/shop/guest-cart";
import { errorMessage, type ApiFailure } from "@/lib/api-call";
import { formatTime } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { routes } from "@/lib/routes";
import { useReferential } from "@/lib/use-referential";

import { getOrder, payOrder } from "./api";
import { clearCheckout, readCheckout, readOrderToken } from "./checkout-storage";

type Order = Schemas["Order"];
type Loaded = { order: Order } | { failure: ApiFailure } | { expired: true };

function articles(order: Order): string {
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return `${count} article${count > 1 ? "s" : ""}`;
}

/**
 * WK06 / WK09 · Paiement de la commande invitée : total et heure limite de réservation lus dans la commande (D37,
 * D38), `PaymentForm` → `POST payments/orders/{reference}/payments/` → `PaymentStatusPanel` (attente, succès, échec).
 * Échec : le panier est conservé, « Changer de numéro » ou « Réessayer ». Succès : panier vidé, suivi WK07.
 * `ORDER_EXPIRED` → retour au panier ; `NETWORK_UNAVAILABLE` (réseau désactivé) → erreur du champ réseau.
 */
export function PaymentStep() {
  const router = useRouter();
  const [{ reference, delivery }] = useState(readCheckout);
  const [token] = useState(() => (reference ? readOrderToken(reference) : null));
  const countries = useReferential("countries");
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ attempt: number; value: Loaded } | null>(null);
  const [payment, setPayment] = useState<Schemas["Payment"] | null>(null);
  const [failed, setFailed] = useState(false);
  const lastValues = useRef<PaymentFormValues | null>(null);
  // Un seul envoi à la fois : un double clic sur « Réessayer » ne lance pas deux débits
  const inFlight = useRef(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
      router.replace(routes.checkout.delivery);
      return;
    }
    let current = true;
    getOrder(reference, token).then((result) => {
      if (!current) return;
      if (!result.ok) return setLoaded({ attempt, value: { failure: result } });
      // Payée, ou remboursée (paiement arrivé après le délai, C17) : le suivi WK07 en donne l'issue
      if (result.data.status === "paid" || result.data.status === "refunded") {
        return router.replace(routes.order(reference));
      }
      // Le statut de l'API fait foi : une commande échue mais pas encore annulée répond `ORDER_EXPIRED` au paiement
      setLoaded({ attempt, value: result.data.status === "pending" ? { order: result.data } : { expired: true } });
    });
    return () => {
      current = false;
    };
  }, [reference, token, attempt, router]);

  if (!loaded || loaded.attempt !== attempt) {
    return (
      <div role="status" aria-busy="true" aria-label="Chargement de votre commande…" className="flex flex-col gap-4">
        <SkeletonBlock className="h-24 rounded-[22px]" />
        <SkeletonBlock className="h-72 rounded-[22px]" />
      </div>
    );
  }

  const value = loaded.value;
  if ("expired" in value) {
    return (
      <div role="alert" className="flex flex-col items-center gap-4 rounded-[22px] bg-amber-50 px-6 py-10 text-center">
        <p className="text-base font-black text-ink-900">
          Le délai de réservation est dépassé : les kits ont été remis en vente.
        </p>
        <p className="text-sm font-semibold text-ink-700">Votre panier est conservé : vous pouvez repasser commande.</p>
        <Button href={routes.cart}>Retour au panier</Button>
      </div>
    );
  }
  if ("failure" in value) {
    return (
      <div role="alert" className="flex flex-col items-center gap-4 rounded-[22px] bg-ink-50 px-6 py-10 text-center">
        <p className="text-base font-black text-ink-900">
          {value.failure.code === "NOT_FOUND"
            ? "Cette commande est introuvable. Reprenez depuis votre panier."
            : errorMessage(value.failure, "vous")}
        </p>
        {value.failure.code === "NOT_FOUND" ? (
          <Button href={routes.cart}>Retour au panier</Button>
        ) : (
          <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
            Réessayer
          </Button>
        )}
      </div>
    );
  }

  const { order } = value;

  const pay = async (values: PaymentFormValues) => {
    lastValues.current = values;
    const result = await payOrder(order.reference, token, values);
    if (result.ok) {
      setFailed(false);
      setPayment(result.data);
    } else if (result.code === "ORDER_EXPIRED") {
      setLoaded({ attempt, value: { expired: true } });
    } else if (result.code === "ORDER_ALREADY_PAID") {
      router.replace(routes.order(order.reference));
    }
    return result;
  };

  /** « Réessayer le paiement » (WK09) : mêmes pays, réseau et numéro ; l'erreur d'un nouvel essai est affichée. */
  const retry = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRetrying(true);
    setRetryError(null);
    const result = await pay(lastValues.current!);
    inFlight.current = false;
    setRetrying(false);
    if (!result.ok) setRetryError(errorMessage(result, "vous"));
  };

  /** Paiement réussi : la commande est relue, le panier n'est vidé que si elle est payée (remboursée sinon, C17). */
  const settle = async (settled: Schemas["Payment"]) => {
    if (settled.status === "failed") {
      setFailed(true);
      return;
    }
    const fresh = await getOrder(order.reference, token);
    if (fresh.ok && fresh.data.status === "paid") {
      writeGuestCart([]);
      clearCheckout();
    }
    router.push(routes.order(order.reference));
  };

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="total" className="rounded-[22px] bg-primary-50 p-5">
        <h2 id="total" className="text-sm font-extrabold text-primary-800">
          Total à payer · {articles(order)} + livraison
        </h2>
        <p className="mt-1 text-[32px] font-black text-primary-700">{formatPrice(order.total)}</p>
        <dl className="mt-3 flex flex-col gap-1.5">
          <WKSummaryRow label="Articles HT" value={formatPrice(order.subtotal)} />
          <WKSummaryRow
            label={order.deliveryZone ? `Livraison (${order.deliveryZone.name})` : "Livraison"}
            value={formatPrice(order.shippingFee)}
          />
          <TaxRows taxes={order.taxes} />
        </dl>
        <p className="mt-3 text-[13px] font-bold text-ink-700">
          Vos kits sont réservés jusqu&apos;à {formatTime(order.expiresAt)} : payez avant cette heure.
        </p>
      </section>

      {payment ? (
        <>
          <PaymentStatusPanel
            key={payment.id}
            payment={payment}
            register="vous"
            guestToken={token ?? undefined}
            ordersHref={routes.order(order.reference)}
            success={{
              message: `Votre commande ${order.reference} est confirmée. Un SMS vous permet d'en suivre la livraison.`,
              action: { label: "Suivre ma commande", href: routes.order(order.reference) },
            }}
            onChangeNumber={() => setPayment(null)}
            onRetry={() => void retry()}
            retrying={retrying}
            onSettled={(settled) => void settle(settled)}
          />
          {retryError && (
            <p role="alert" className="text-center text-sm font-bold text-error-700">
              {retryError}
            </p>
          )}
          {failed && (
            <p role="status" className="text-center text-sm font-bold text-ink-700">
              Votre panier est conservé : vous pouvez réessayer avec un autre numéro.
            </p>
          )}
        </>
      ) : (
        <section aria-label="Paiement Mobile Money" className="rounded-[22px] border-2 border-ink-100 bg-surface p-5">
          {/* Le pays présélectionné est fixé au montage du formulaire : il attend la liste des pays */}
          {countries.items ? (
            <PaymentForm
              amount={order.total}
              countries={countries.items}
              defaultCountry={delivery?.country}
              register="vous"
              onSubmit={pay}
            />
          ) : countries.status === "error" ? (
            <div role="alert" className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-bold text-error-700">Impossible de charger la liste des pays.</p>
              <Button variant="outline" size="sm" onClick={countries.retry}>
                Réessayer
              </Button>
            </div>
          ) : (
            <Loader label="Chargement du formulaire de paiement…" />
          )}
        </section>
      )}
    </div>
  );
}
