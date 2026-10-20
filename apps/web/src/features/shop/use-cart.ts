"use client";

import type { Schemas } from "@steamy/api-client";
import { useCallback, useEffect, useState } from "react";

import { errorMessage, type ApiFailure, type Register } from "@/lib/api-call";

import {
  getCart,
  getKitDetail,
  mergeGuestCart,
  probeShopper,
  removeCartItem,
  updateCartItem,
  type Shopper,
} from "./api";
import { readGuestCart, removeGuestLine, setGuestQuantity, takeDroppedLines } from "./guest-cart";

/** Ligne du panier telle que l'écran l'affiche : kit relu dans l'API, `id` de la ligne pour le panier serveur. */
export type CartLine = { kit: Schemas["Kit"]; quantity: number; total: number; id?: number };

export type CartContents = {
  lines: CartLine[];
  /** Nombre d'articles (somme des quantités). */
  count: number;
  /** Somme des lignes hors livraison : celle de l'API pour un panier serveur, celle des prix relus pour l'invité. */
  subtotal: number;
  /**
   * Kits retirés du panier : retirés de la vente depuis l'ajout (invité), ou refusés à la fusion du panier invité
   * dans le panier serveur après la connexion (kit épuisé ou retiré).
   */
  dropped: number;
};

export type CartState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | ({ status: "ready"; shopper: Shopper } & CartContents);

/** `learner` : espace apprenant, panier serveur. `public` : boutique publique, panier selon la session. */
export type CartContext = "learner" | "public";

class CartLoadError extends Error {
  constructor(readonly failure: ApiFailure) {
    super(failure.message);
  }
}

function fromServer(cart: Schemas["Cart"], dropped = 0): CartContents {
  return {
    lines: cart.items.map((item) => ({ kit: item.kit, quantity: item.quantity, total: item.total, id: item.id })),
    count: cart.count,
    subtotal: cart.subtotal,
    dropped,
  };
}

function summed(lines: CartLine[], dropped: number): CartContents {
  return {
    lines,
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: lines.reduce((sum, line) => sum + line.total, 0),
    dropped,
  };
}

async function loadGuest(): Promise<CartContents> {
  const stored = readGuestCart();
  const details = await Promise.all(stored.map((line) => getKitDetail(line.kitSlug)));
  const lines: CartLine[] = [];
  let dropped = 0;
  details.forEach((result, index) => {
    const { kitSlug, quantity } = stored[index];
    if (result.ok) {
      lines.push({ kit: result.data, quantity, total: result.data.price * quantity });
    } else if (result.code === "NOT_FOUND") {
      dropped += 1;
      removeGuestLine(kitSlug);
    } else {
      throw new CartLoadError(result);
    }
  });
  return summed(lines, dropped);
}

async function load(context: CartContext): Promise<Extract<CartState, { status: "ready" }>> {
  const shopper = context === "learner" ? "learner" : await probeShopper();
  if (shopper === "guest") return { status: "ready", shopper, ...(await loadGuest()) };
  // Retour de la connexion : le panier invité rejoint le panier serveur (idempotent, stockage vidé au fil de l'eau)
  if (readGuestCart().length > 0) await mergeGuestCart();
  const cart = await getCart();
  if (!cart.ok) throw new CartLoadError(cart);
  return { status: "ready", shopper, ...fromServer(cart.data, takeDroppedLines()) };
}

/**
 * Panier de la boutique (WK03, WK10), même interface pour l'invité (`localStorage`, D38) et le compte connecté
 * (`shop/cart/`). Les quantités et retraits renvoient un message d'erreur à afficher, ou `null`.
 */
export function useCart(context: CartContext, register: Register) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ attempt: number; state: CartState }>({
    attempt: -1,
    state: { status: "loading" },
  });
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    load(context).then(
      (state) => current && setLoaded({ attempt, state }),
      (error: unknown) => {
        const failure: Pick<ApiFailure, "code" | "message"> =
          error instanceof CartLoadError ? error.failure : { code: "SERVER_ERROR", message: "" };
        if (current) setLoaded({ attempt, state: { status: "error", message: errorMessage(failure, register) } });
      },
    );
    return () => {
      current = false;
    };
  }, [context, attempt, register]);

  const state: CartState = loaded.attempt === attempt ? loaded.state : { status: "loading" };
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  /** Change la quantité d'une ligne affichée (`null` : la retire) ; appelé seulement quand le panier est prêt. */
  const change = async (line: CartLine, quantity: number | null): Promise<string | null> => {
    const ready = state as Extract<CartState, { status: "ready" }>;
    const slug = line.kit.slug;
    if (ready.shopper === "guest") {
      if (quantity === null) removeGuestLine(slug);
      else setGuestQuantity(slug, quantity);
      const lines = ready.lines.flatMap((l) =>
        l.kit.slug !== slug ? [l] : quantity === null ? [] : [{ ...l, quantity, total: l.kit.price * quantity }],
      );
      setLoaded({ attempt, state: { ...ready, ...summed(lines, ready.dropped) } });
      return null;
    }
    setPending(slug);
    const result = quantity === null ? await removeCartItem(line.id!) : await updateCartItem(line.id!, quantity);
    setPending(null);
    if (!result.ok) return errorMessage(result, register);
    setLoaded({ attempt, state: { status: "ready", shopper: ready.shopper, ...fromServer(result.data) } });
    return null;
  };

  return {
    state,
    /** Slug de la ligne en cours d'enregistrement (panier serveur). */
    pending,
    reload,
    setQuantity: (line: CartLine, quantity: number) => change(line, quantity),
    remove: (line: CartLine) => change(line, null),
  };
}

