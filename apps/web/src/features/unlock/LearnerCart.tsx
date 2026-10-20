"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { CartView } from "@/features/shop/CartView";
import { errorMessage } from "@/lib/api-call";
import { routes } from "@/lib/routes";

import { createPaymentRequest } from "./api";

/**
 * WK03 → WK08 · Panier de l'apprenant : « Demander à mon parent » crée la demande de kit avec les lignes du panier
 * (`POST payments/payment-requests/ { kind: "kit", items }`, montant calculé par le serveur) puis ouvre la demande.
 */
export function LearnerCart({ zones }: { zones?: ReactNode }) {
  const router = useRouter();
  const requestParent = async (items: Array<{ kitSlug: string; quantity: number }>) => {
    const result = await createPaymentRequest({ kind: "kit", items });
    if (!result.ok) return Object.values(result.fields)[0] || errorMessage(result, "tu");
    router.push(routes.learner.request(result.data.id));
    return null;
  };
  return <CartView context="learner" zones={zones} onRequestParent={requestParent} />;
}
