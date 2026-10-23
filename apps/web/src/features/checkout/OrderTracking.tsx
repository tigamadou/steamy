"use client";

import type { Schemas } from "@steamy/api-client";
import { useEffect, useState } from "react";

import { Button, Mascot, ShippingTimeline, SkeletonBlock, TaxRows, WKSummaryRow } from "@/components/ds";
import { errorMessage, type ApiFailure } from "@/lib/api-call";
import { cx } from "@/lib/cx";
import { formatPrice } from "@/lib/format";
import { routes } from "@/lib/routes";

import { getInvoice, getOrder } from "./api";
import { readOrderToken, saveOrderToken } from "./checkout-storage";
import { ORDER_STATUS_MESSAGES } from "./order-status";
import { shippingSteps } from "./shipping";

const FRAGMENT = /^#jeton=([\w-]+)$/;

/**
 * Jeton d'accès de la commande : celui du lien SMS (`#jeton=…`, fragment jamais envoyé au serveur) est gardé dans
 * l'onglet puis retiré de l'adresse ; sinon celui remis à la création de la commande.
 */
function takeToken(reference: string): string | null {
  const match = FRAGMENT.exec(window.location.hash);
  if (match) {
    saveOrderToken(reference, match[1]);
    window.history.replaceState(window.history.state, "", window.location.pathname);
    return match[1];
  }
  return readOrderToken(reference);
}

type Loaded = { order: Schemas["Order"]; token: string | null } | { failure: ApiFailure };

/**
 * WK07 · Confirmation et suivi d'une commande de kits (C10) : référence, `ShippingTimeline` issue de
 * `shippingStatus`, mention du Kit Code imprimé sur la notice, reçu (facture PDF), retour à la boutique.
 */
export function OrderTracking({ reference }: { reference: string }) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ attempt: number; value: Loaded } | null>(null);
  const [invoice, setInvoice] = useState<{ pending: boolean; message?: string }>({ pending: false });

  useEffect(() => {
    let current = true;
    const token = takeToken(reference);
    getOrder(reference, token).then((result) => {
      if (current) setLoaded({ attempt, value: result.ok ? { order: result.data, token } : { failure: result } });
    });
    return () => {
      current = false;
    };
  }, [reference, attempt]);

  if (!loaded || loaded.attempt !== attempt) {
    return (
      <div role="status" aria-busy="true" aria-label="Chargement de la commande…" className="flex flex-col gap-4">
        <SkeletonBlock className="h-28 rounded-[22px]" />
        <SkeletonBlock className="h-56 rounded-[22px]" />
      </div>
    );
  }

  if ("failure" in loaded.value) {
    const missing = loaded.value.failure.code === "NOT_FOUND";
    return (
      <div className="flex flex-col items-center gap-4 rounded-[22px] bg-ink-50 px-6 py-10 text-center">
        <h1 className="text-[24px] font-black text-ink-900">
          {missing ? "Commande introuvable" : "Impossible d'afficher la commande"}
        </h1>
        <p role="alert" className="max-w-[440px] text-sm font-semibold text-ink-700">
          {missing
            ? "Ouvrez le lien reçu par SMS sur cet appareil pour suivre votre commande."
            : errorMessage(loaded.value.failure, "vous")}
        </p>
        {missing ? (
          <Button href={routes.shop}>Retour à la boutique</Button>
        ) : (
          <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
            Réessayer
          </Button>
        )}
      </div>
    );
  }

  const { order, token } = loaded.value;
  const paid = order.status === "paid";

  const download = async () => {
    setInvoice({ pending: true });
    const result = await getInvoice(order.reference, token);
    if (!result.ok) {
      setInvoice({
        pending: false,
        message:
          result.code === "PDF_NOT_READY"
            ? "Le reçu est en cours de préparation. Réessayez dans un instant."
            : errorMessage(result, "vous"),
      });
      return;
    }
    const url = URL.createObjectURL(result.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `recu-${order.reference}.pdf`;
    link.click();
    // Libérée après coup : certains navigateurs lisent l'URL après le clic
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setInvoice({ pending: false });
  };

  return (
    <div className="flex flex-col gap-6">
      <div
        className={cx(
          "flex flex-col items-center gap-4 rounded-[22px] p-6 text-center sm:flex-row sm:text-left",
          paid ? "bg-success-50" : "bg-ink-50",
        )}
      >
        <Mascot pose={paid ? "cheer" : "focus"} size={100} />
        <div>
          <h1 className="text-[26px] font-black text-ink-900">{ORDER_STATUS_MESSAGES[order.status].title}</h1>
          <p className="mt-1.5 text-sm font-semibold text-ink-700">
            Commande <strong>{order.reference}</strong> · {ORDER_STATUS_MESSAGES[order.status].body}
          </p>
        </div>
      </div>

      {paid && (
        <section aria-labelledby="suivi" className="rounded-[22px] border-2 border-ink-100 bg-surface p-5">
          <h2 id="suivi" className="mb-4 text-lg font-black text-ink-900">
            Suivi de livraison
          </h2>
          <ShippingTimeline steps={shippingSteps(order)} />
          <p className="mt-5 rounded-[14px] bg-amber-50 p-3.5 text-sm font-bold text-amber-700">
            Le Kit Code est imprimé sur la notice du kit : l&apos;apprenant le saisit dans son espace pour débloquer
            son parcours.
          </p>
        </section>
      )}

      <section aria-labelledby="recap" className="rounded-[22px] border-2 border-ink-100 bg-surface p-5">
        <h2 id="recap" className="mb-3 text-lg font-black text-ink-900">
          Récapitulatif
        </h2>
        <ul className="mb-3 flex flex-col gap-1.5 text-sm font-bold text-ink-800">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span>
                {item.title} × {item.quantity}
              </span>
              <span>{formatPrice(item.total)}</span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-2 border-t border-ink-100 pt-3">
          <WKSummaryRow label="Sous-total HT" value={formatPrice(order.subtotal)} />
          <WKSummaryRow
            label={order.deliveryZone ? `Livraison (${order.deliveryZone.name})` : "Livraison"}
            value={formatPrice(order.shippingFee)}
          />
          <TaxRows taxes={order.taxes} />
          <WKSummaryRow label="Total à payer" value={formatPrice(order.total)} strong />
        </dl>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        {paid && order.invoice && (
          <Button variant="outline" size="lg" icon="arrow-right" loading={invoice.pending} onClick={download}>
            Télécharger le reçu
          </Button>
        )}
        <Button size="lg" href={routes.shop} iconRight="arrow-right">
          Retour à la boutique
        </Button>
      </div>
      {invoice.message && (
        <p role="alert" className="text-sm font-bold text-error-700">
          {invoice.message}
        </p>
      )}
    </div>
  );
}
