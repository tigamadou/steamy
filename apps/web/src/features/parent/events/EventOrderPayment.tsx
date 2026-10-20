"use client";

import type { Schemas } from "@steamy/api-client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Button, Loader, type PaymentFormProps, type PhoneCountry } from "@/components/ds";
import { OrderPayment } from "@/features/parent/payment-request/OrderPayment";
import { apiCall, errorMessage } from "@/lib/api-call";
import { formatInstantTime } from "@/lib/dates";
import { routes } from "@/lib/routes";

export type EventOrderPaymentProps = {
  /** Commande d'événement créée par l'API à l'accord du parent (`orderReference`, D53 amendé). */
  orderReference: string;
  countries: PhoneCountry[];
  preferred?: PaymentFormProps["preferred"];
  /** WA05 : confirmation de l'inscription. */
  success: ReactNode;
};

type Loaded = { order: Schemas["Order"] } | { error: string };

/**
 * Paiement de la commande d'un événement payant (WPD06, WPD12) avec le formulaire de WPD15, sans demande de paiement :
 * total et heure limite de la place réservée lus dans la commande ; la candidature n'est acceptée qu'au paiement.
 */
export function EventOrderPayment({ orderReference, countries, preferred, success }: EventOrderPaymentProps) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ attempt: number; value: Loaded } | null>(null);

  useEffect(() => {
    let current = true;
    void apiCall((api) =>
      api.GET("/api/payments/orders/{reference}/", { params: { path: { reference: orderReference } } }),
    ).then((result) => {
      if (current) {
        setLoaded({ attempt, value: result.ok ? { order: result.data } : { error: errorMessage(result, "vous") } });
      }
    });
    return () => {
      current = false;
    };
  }, [orderReference, attempt]);

  if (!loaded || loaded.attempt !== attempt) return <Loader label="Chargement de la commande…" />;
  if ("error" in loaded.value) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 text-sm font-bold text-error-700">
        {loaded.value.error}
        <Button variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
          Réessayer
        </Button>
      </div>
    );
  }
  const { order } = loaded.value;
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 rounded-[14px] bg-primary-50 px-4 py-3 text-[13px] font-bold text-ink-700">
        Place réservée jusqu&apos;au <time dateTime={order.expiresAt}>{formatInstantTime(order.expiresAt)}</time> : la
        participation est confirmée dès le paiement, dans la limite des places.
      </p>
      <OrderPayment
        amount={order.total}
        reference={async () => ({ ok: true, data: order.reference })}
        countries={countries}
        preferred={preferred}
        success={{ message: success, action: { label: "Voir les événements", href: routes.parent.events } }}
        onOrderClosed={() => router.refresh()}
      />
    </div>
  );
}
