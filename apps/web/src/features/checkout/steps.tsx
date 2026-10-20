"use client";

import { CheckoutGate } from "./CheckoutGate";
import { DeliveryForm } from "./DeliveryForm";
import { GuestInfoForm } from "./GuestInfoForm";

/** WK04 : coordonnées, une fois le panier vérifié. */
export function GuestStep() {
  return <CheckoutGate>{() => <GuestInfoForm />}</CheckoutGate>;
}

/** WK05 : livraison et création de la commande à partir du panier. */
export function DeliveryStep() {
  return <CheckoutGate>{(cart) => <DeliveryForm cart={cart} />}</CheckoutGate>;
}
