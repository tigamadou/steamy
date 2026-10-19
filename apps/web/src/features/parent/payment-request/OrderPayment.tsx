"use client";

import type { Schemas } from "@steamy/api-client";
import { useRef, useState, type ReactNode } from "react";

import {
  PaymentForm,
  PaymentStatusPanel,
  type PaymentFormProps,
  type PaymentFormValues,
  type PhoneCountry,
} from "@/components/ds";
import { apiCall, type ApiResult } from "@/lib/api-call";
import { routes } from "@/lib/routes";

import { translated } from "./messages";

type Payment = Schemas["Payment"];

export type OrderPaymentProps = {
  /** Total de la commande à payer, calculé par le serveur (D37). */
  amount: number;
  /** Référence de la commande à payer, créée au premier envoi si besoin (WPD15 : commande d'une demande). */
  reference: () => Promise<ApiResult<string>>;
  countries: PhoneCountry[];
  preferred?: PaymentFormProps["preferred"];
  /** WA05 : message et retour, dans le shell parent. */
  success: { message: ReactNode; action: { label: string; href: string } };
  /** La commande a expiré ou est déjà payée : l'écran se met à jour. */
  onOrderClosed: (code: "ORDER_EXPIRED" | "ORDER_ALREADY_PAID") => void;
  /** État du paiement en cours, pour la pastille de l'écran. */
  onState?: (state: "pending" | "confirming" | "failed" | "paid") => void;
};

/**
 * Paiement Mobile Money d'une commande dans le shell parent (WPD15, et l'événement payant de 4.6) : `PaymentForm`
 * (WA03), puis `PaymentStatusPanel` (WA04 attente avec interrogation du statut, WA05 succès, WA07 échec). Le succès
 * n'est affiché que sur `succeeded` (webhook, S9). « Réessayer » rejoue le dernier numéro, « Changer de numéro »
 * revient au formulaire.
 */
export function OrderPayment({ amount, reference, countries, preferred, success, onOrderClosed, onState }: OrderPaymentProps) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [round, setRound] = useState(0);
  const last = useRef<PaymentFormValues | null>(null);
  // Valeurs du dernier envoi, reprises par le formulaire quand le parent revient changer de numéro
  const [lastValues, setLastValues] = useState<PaymentFormValues | null>(null);

  async function pay(values: PaymentFormValues): Promise<ApiResult<unknown>> {
    last.current = values;
    const order = await reference();
    if (!order.ok) return translated(order);
    const result = await apiCall((api) =>
      api.POST("/api/payments/orders/{reference}/payments/", {
        params: { path: { reference: order.data } },
        body: values,
      }),
    );
    if (result.ok) {
      setPayment(result.data);
      onState?.(result.data.status === "failed" ? "failed" : "confirming");
      return result;
    }
    if (result.code === "ORDER_EXPIRED" || result.code === "ORDER_ALREADY_PAID") onOrderClosed(result.code);
    return translated(result);
  }

  function backToForm() {
    setLastValues(last.current);
    setPayment(null);
    setRound((n) => n + 1);
    onState?.("pending");
  }

  if (payment) {
    return (
      <PaymentStatusPanel
        key={payment.id}
        payment={payment}
        register="vous"
        ordersHref={routes.parent.orders}
        success={success}
        onChangeNumber={backToForm}
        onRetry={() =>
          void pay(last.current as PaymentFormValues).then((result) => {
            if (!result.ok) backToForm();
          })
        }
        onSettled={(settled) => onState?.(settled.status === "succeeded" ? "paid" : "failed")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-[22px] border-2 border-ink-100 bg-surface p-4 sm:p-5.5">
      <h2 className="m-0 text-lg font-black text-ink-900">Payer par Mobile Money</h2>
      <PaymentForm
        key={round}
        amount={amount}
        countries={countries}
        // Retour au formulaire après un échec : le pays, le réseau et le numéro saisis restent préremplis
        preferred={
          lastValues
            ? { country: lastValues.country, network: lastValues.network, phone: lastValues.msisdn }
            : preferred
        }
        onSubmit={pay}
      />
    </div>
  );
}
