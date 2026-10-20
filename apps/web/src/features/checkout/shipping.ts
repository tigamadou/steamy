import type { Schemas } from "@steamy/api-client";

import type { ShippingStep } from "@/components/ds";
import { formatInstant, formatTime } from "@/lib/dates";

const ORDER: Array<Schemas["ShippingStatusEnum"]> = ["preparing", "shipped", "delivered"];

/**
 * Étapes de `ShippingTimeline` pour une commande de kits payée (WK07, WPD07), lues dans `status`, `paidAt` et
 * `shippingStatus` ; la livraison annonce le délai de la zone (D38), jamais un délai écrit en dur.
 */
export function shippingSteps(order: Pick<Schemas["Order"], "paidAt" | "shippingStatus" | "deliveryZone">): ShippingStep[] {
  const reached = ORDER.indexOf(order.shippingStatus);
  // Livrée : dernière étape atteinte, donc terminée et non « en cours »
  const state = (index: number): ShippingStep["state"] => {
    if (index < reached || (index === reached && index === ORDER.length - 1)) return "done";
    return index === reached ? "current" : "todo";
  };
  const paid = order.paidAt && `${formatInstant(order.paidAt)} à ${formatTime(order.paidAt)}`;
  return [
    { label: "Commande confirmée", meta: paid, state: "done" },
    { label: "En préparation", state: state(0) },
    { label: "Expédiée", meta: reached < 1 ? "À venir" : undefined, state: state(1) },
    {
      label: "Livrée",
      meta: reached < 2 && order.deliveryZone ? `Délai annoncé : ${order.deliveryZone.delayLabel}` : undefined,
      state: state(2),
    },
  ];
}
