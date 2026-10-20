"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

import { Button, Mascot, SkeletonBlock, WKCartRow, WKSummaryRow } from "@/components/ds";
import { formatPrice } from "@/lib/format";
import { routes } from "@/lib/routes";
import { useUndoableAction } from "@/lib/use-undoable-action";

import type { ShopContext } from "./AddToCartButton";
import { useCart, type CartLine } from "./use-cart";

export type CartViewProps = {
  context: ShopContext;
  /** Délais par zone (WK10), rendus par la page serveur. */
  zones?: ReactNode;
  /**
   * « Demander à mon parent » de l'apprenant (WK08, étape 3.7c) : sans ce rappel, le bouton est absent. Reçoit les
   * lignes du panier (identifiants et quantités).
   */
  onRequestParent?: (items: Array<{ kitSlug: string; quantity: number }>) => void;
};

function articles(count: number): string {
  return `${count} article${count > 1 ? "s" : ""}`;
}

/**
 * WK03 / WK10 · Panier. Invité : `localStorage`, CTA « Commander » → WK04. Apprenant : panier serveur, CTA « Demander à
 * mon parent » (WK08). Un apprenant connecté arrivé sur le panier public est renvoyé vers le sien. Prix et sous-total
 * de l'API ; la livraison est calculée à l'étape suivante.
 */
export function CartView({ context, zones, onRequestParent }: CartViewProps) {
  const router = useRouter();
  const tu = context === "learner";
  const register = tu ? "tu" : "vous";
  const { state, pending, reload, setQuantity, remove } = useCart(context, register);
  const { notify, toast } = useUndoableAction();
  const listHeading = useRef<HTMLHeadingElement>(null);
  const shop = tu ? routes.learner.shop : routes.shop;
  const kitHref = tu ? routes.learner.shopKit : routes.shopKit;

  const learnerOnPublic = context === "public" && state.status === "ready" && state.shopper === "learner";
  useEffect(() => {
    if (learnerOnPublic) router.replace(routes.learner.cart);
  }, [learnerOnPublic, router]);

  if (state.status === "loading" || learnerOnPublic) return <CartSkeleton />;
  if (state.status === "error") {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-[22px] bg-ink-50 px-6 py-10 text-center">
        <p className="text-base font-black text-ink-900">{state.message}</p>
        <Button variant="outline" icon="arrow-right" onClick={reload}>
          Réessayer
        </Button>
      </div>
    );
  }

  const dropped =
    state.dropped > 0 &&
    (tu
      ? "Un kit de ton panier n'est plus en vente : il a été retiré."
      : "Un kit de votre panier n'est plus en vente : il a été retiré.");

  if (state.lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
        {dropped && (
          <p role="status" className="text-sm font-bold text-amber-700">
            {dropped}
          </p>
        )}
        <Mascot pose="sad" size={130} />
        <h2 className="text-[22px] font-black text-ink-900">{tu ? "Ton panier est vide" : "Votre panier est vide"}</h2>
        <p className="max-w-[420px] text-sm font-semibold text-ink-600">
          {tu
            ? "Choisis un kit pour construire pour de vrai, puis demande-le à ton parent."
            : "Choisissez un kit pour construire pour de vrai, livré chez vous."}
        </p>
        <Button href={shop} icon="cart">
          Voir les kits
        </Button>
        {zones && <div className="mt-2 w-full max-w-[420px] text-left">{zones}</div>}
      </div>
    );
  }

  const unavailable = state.lines.some((line) => !line.kit.available);

  const change = async (line: CartLine, quantity: number | null) => {
    const error = quantity === null ? await remove(line) : await setQuantity(line, quantity);
    if (error) {
      notify(error, "error");
    } else if (quantity === null) {
      notify(`« ${line.kit.name} » retiré du panier.`);
      // La ligne disparaît : le focus revient en tête de liste (WCAG 2.4.3)
      listHeading.current?.focus();
    }
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-labelledby="panier-articles" className="flex min-w-0 flex-col gap-3">
        <h2 id="panier-articles" ref={listHeading} tabIndex={-1} className="sr-only">
          Articles du panier
        </h2>
        {dropped && (
          <p role="status" className="rounded-[14px] bg-amber-50 p-3 text-sm font-bold text-amber-700">
            {dropped}
          </p>
        )}
        <ul className="flex flex-col gap-3">
          {state.lines.map((line) => (
            <li key={line.kit.slug}>
              <WKCartRow
                name={line.kit.name}
                href={kitHref(line.kit.slug)}
                emoji={line.kit.emoji || line.kit.category.icon}
                color={line.kit.category.color}
                priceLabel={formatPrice(line.kit.price)}
                totalLabel={formatPrice(line.total)}
                quantity={line.quantity}
                unavailable={!line.kit.available}
                busy={pending === line.kit.slug}
                onQuantityChange={(quantity) => change(line, quantity)}
                onRemove={() => change(line, null)}
              />
            </li>
          ))}
        </ul>
        <Button variant="ghost" icon="arrow-left" href={shop} className="self-start">
          Continuer mes achats
        </Button>
      </section>

      <section
        aria-labelledby="panier-recap"
        className="flex flex-col gap-3.5 rounded-[22px] border-2 border-ink-100 bg-surface p-5 lg:sticky lg:top-4"
      >
        <h2 id="panier-recap" className="text-lg font-black text-ink-900">
          Récapitulatif
        </h2>
        <dl className="flex flex-col gap-2.5">
          <WKSummaryRow label={`Sous-total (${articles(state.count)})`} value={formatPrice(state.subtotal)} />
          <WKSummaryRow label="Livraison" value="Calculée à l'étape suivante" />
          <div aria-hidden className="h-px bg-ink-100" />
          <WKSummaryRow label="Total hors livraison" value={formatPrice(state.subtotal)} strong />
        </dl>
        {unavailable && (
          <p role="alert" className="text-sm font-bold text-error-700">
            {tu
              ? "Retire les kits indisponibles pour continuer."
              : "Retirez les kits indisponibles pour continuer."}
          </p>
        )}
        {state.shopper === "learner" ? (
          onRequestParent && (
            <Button
              block
              size="lg"
              icon="gift"
              disabled={unavailable}
              onClick={() =>
                onRequestParent(state.lines.map((line) => ({ kitSlug: line.kit.slug, quantity: line.quantity })))
              }
            >
              Demander à mon parent
            </Button>
          )
        ) : unavailable ? (
          <Button block size="lg" disabled>
            Commander
          </Button>
        ) : (
          <Button block size="lg" href={routes.checkout.guest} iconRight="arrow-right">
            Commander
          </Button>
        )}
      </section>
      {toast}
    </div>
  );
}

/** Chargement du panier : lignes et récapitulatif en silhouette. */
export function CartSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement du panier…" className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-3">
        <SkeletonBlock className="h-24 rounded-2xl" />
        <SkeletonBlock className="h-24 rounded-2xl" />
      </div>
      <SkeletonBlock className="h-64 rounded-[22px]" />
    </div>
  );
}
