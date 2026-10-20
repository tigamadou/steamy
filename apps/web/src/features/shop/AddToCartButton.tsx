"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ds";
import { errorMessage } from "@/lib/api-call";
import { useUndoableAction } from "@/lib/use-undoable-action";

import { addToCart } from "./api";
import { cartHref, type ShopContext } from "./shop-routes";

export type AddToCartButtonProps = {
  slug: string;
  name: string;
  context: ShopContext;
  /** `card` : « Ajouter » de WK01. `detail` : « Ajouter au panier » et « Acheter maintenant » de WK02. */
  variant?: "card" | "detail";
};

/**
 * Ajout au panier (WK01, WK02) : toast de confirmation (`aria-live`), message de l'API sinon. « Acheter maintenant »
 * ajoute le kit puis ouvre le panier (WK03).
 */
export function AddToCartButton({ slug, name, context, variant = "card" }: AddToCartButtonProps) {
  const router = useRouter();
  const { notify, toast } = useUndoableAction();
  const [pending, setPending] = useState<"add" | "buy" | null>(null);
  const tu = context === "learner";

  const add = async (buy: boolean) => {
    setPending(buy ? "buy" : "add");
    const result = await addToCart(context, slug);
    setPending(null);
    if (!result.ok) {
      notify(
        result.code === "OUT_OF_STOCK" ? "Ce kit vient d'être épuisé." : errorMessage(result, tu ? "tu" : "vous"),
        "error",
      );
      return;
    }
    if (buy) {
      router.push(cartHref(result.data.shopper));
      return;
    }
    notify(tu ? `« ${name} » est dans ton panier.` : `« ${name} » est dans votre panier.`);
  };

  if (variant === "card") {
    return (
      <>
        <Button size="sm" icon="cart" loading={pending !== null} onClick={() => add(false)} aria-label={`Ajouter ${name} au panier`}>
          Ajouter
        </Button>
        {toast}
      </>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <Button block size="lg" icon="cart" loading={pending === "add"} disabled={pending === "buy"} onClick={() => add(false)}>
        Ajouter au panier
      </Button>
      <Button block variant="outline" loading={pending === "buy"} disabled={pending === "add"} onClick={() => add(true)}>
        Acheter maintenant
      </Button>
      {toast}
    </div>
  );
}
