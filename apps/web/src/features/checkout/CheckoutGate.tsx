"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Button, SkeletonBlock } from "@/components/ds";
import { useCart, type CartState } from "@/features/shop/use-cart";
import { routes } from "@/lib/routes";

export type ReadyCart = Extract<CartState, { status: "ready" }>;

/** Lignes envoyées à la commande : identifiants et quantités, jamais de prix (D37). */
export function orderItems(cart: ReadyCart) {
  return cart.lines.map((line) => ({ kitSlug: line.kit.slug, quantity: line.quantity }));
}

function Notice({ children, action }: { children: ReactNode; action: ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-center gap-4 rounded-[22px] bg-ink-50 px-6 py-10 text-center">
      <p className="text-base font-black text-ink-900">{children}</p>
      {action}
    </div>
  );
}

/**
 * Garde du tunnel invité : le panier doit être lu, non vide et entièrement disponible. Un apprenant connecté est
 * renvoyé vers son panier (il demande à son parent, S3) ; un parent connecté vers le panier public, qui le mène à son
 * espace (le tunnel invité lui redemanderait nom et téléphone). Rend `children` avec le panier prêt.
 */
export function CheckoutGate({ children }: { children: (cart: ReadyCart) => ReactNode }) {
  const router = useRouter();
  const { state, reload } = useCart("public", "vous");
  const shopper = state.status === "ready" ? state.shopper : null;
  const away = shopper === "learner" || shopper === "parent";
  useEffect(() => {
    if (shopper === "learner") router.replace(routes.learner.cart);
    else if (shopper === "parent") router.replace(routes.cart);
  }, [shopper, router]);

  if (state.status === "loading" || away) {
    return (
      <div role="status" aria-busy="true" aria-label="Chargement de votre commande…" className="flex flex-col gap-4">
        <SkeletonBlock className="h-14 rounded-lg" />
        <SkeletonBlock className="h-14 rounded-lg" />
        <SkeletonBlock className="h-14 rounded-lg" />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <Notice
        action={
          <Button variant="outline" onClick={reload}>
            Réessayer
          </Button>
        }
      >
        {state.message}
      </Notice>
    );
  }
  if (state.lines.length === 0) {
    return <Notice action={<Button href={routes.shop}>Voir les kits</Button>}>Votre panier est vide.</Notice>;
  }
  if (state.lines.some((line) => !line.kit.available)) {
    return (
      <Notice action={<Button href={routes.cart}>Retour au panier</Button>}>
        Un kit de votre panier n&apos;est plus disponible : retirez-le pour continuer.
      </Notice>
    );
  }
  return children(state);
}
