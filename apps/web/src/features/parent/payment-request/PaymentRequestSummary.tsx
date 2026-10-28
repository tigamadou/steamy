import type { Schemas } from "@steamy/api-client";
import type { ReactNode } from "react";

import { Avatar, Badge } from "@/components/ds";
import type { PaymentRequest } from "@/features/unlock/types";
import { formatInstant } from "@/lib/dates";
import { formatPrice, formatPriceHt, quantityLabel, TAX_LABELS } from "@/lib/format";

import { STATE_BADGES, type ScreenState } from "./messages";

type Child = Pick<Schemas["ChildDetail"], "firstName" | "lastName" | "age" | "schoolGrade" | "avatar">;
type Order = Pick<Schemas["Order"], "items" | "shippingFee" | "taxes" | "total" | "deliveryZone">;

export type PaymentRequestSummaryProps = {
  request: PaymentRequest;
  child: Child;
  state: ScreenState;
  /** Kit requis par le parcours demandé (catalogue), à saisir par l'enfant avec son Kit Code. */
  requiredKit?: Schemas["RequiredKit"] | null;
  /** Commande créée pour la demande : ses lignes, frais et total (serveur) remplacent ceux de la demande. */
  order?: Order | null;
  /** Adresse de livraison d'un kit (récapitulatif ou formulaire). */
  address?: ReactNode;
};

const KINDS = {
  course: { icon: "📚", label: "Parcours" },
  kit: { icon: "📦", label: "Kit" },
  event: { icon: "📅", label: "Événement" },
} as const;

/** Libellé du montant : à payer tant que la demande est ouverte, « payé » quand la commande réglée est relue,
 * « demandé » une fois close ; hors livraison pour un kit sans commande (frais de zone encore inconnus). */
export function amountLabel(kind: PaymentRequest["kind"], state: ScreenState, hasOrder: boolean): string {
  const closed =
    state === "paid" || state === "refunded" || state === "declined" || state === "expired" || state === "cancelled";
  if (state === "paid" && hasOrder) return "Total payé";
  const base = closed ? "Montant demandé" : "Total à payer";
  return kind === "kit" && !hasOrder ? `${base} hors livraison` : base;
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm font-bold text-ink-600">
      <dt>{label}</dt>
      <dd className="m-0 text-right">{value}</dd>
    </div>
  );
}

/**
 * Colonne de gauche de WPD15 (maquette de 4.0) : enfant bénéficiaire, dates, objet demandé (parcours ou kits) et
 * montants tels que reçus du serveur (D37). Avant la commande d'un kit, les frais de livraison ne sont pas encore
 * connus : le montant de la demande est annoncé « hors livraison ».
 */
export function PaymentRequestSummary({ request, child, state, requiredKit, order, address }: PaymentRequestSummaryProps) {
  const name = `${child.firstName} ${child.lastName}`.trim();
  const meta = [child.age !== null ? `${child.age} ans` : null, child.schoolGrade?.label, "bénéficiaire"]
    .filter(Boolean)
    .join(" · ");
  const kind = KINDS[request.kind];
  const badge = STATE_BADGES[state];
  const title = request.course?.title ?? request.items.map((item) => item.title).join(", ");

  return (
    <section
      aria-labelledby="demande-objet"
      className="flex flex-col gap-3.5 rounded-[22px] border-2 border-ink-100 bg-surface p-4 sm:p-5.5"
    >
      <p className="m-0 text-xs font-black tracking-[0.06em] text-ink-600 uppercase">Demande de votre enfant</p>
      <div className="flex items-center gap-3.5 rounded-[18px] border-2 border-ink-100 bg-bg p-3.5">
        <Avatar name={name} emoji={child.avatar?.emoji} size={48} ring decorative />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-base font-black text-ink-900">{name}</p>
          <p className="m-0 text-[13px] font-bold text-ink-600">{meta}</p>
        </div>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>
      <p className="m-0 text-[13px] font-bold text-ink-600">
        Reçue le <time dateTime={request.createdAt}>{formatInstant(request.createdAt)}</time>
        {state === "pending" || state === "confirming" || state === "failed" || state === "outofstock" ? (
          <>
            {" "}
            · valable jusqu&apos;au <time dateTime={request.expiresAt}>{formatInstant(request.expiresAt)}</time>
          </>
        ) : null}
      </p>

      <div className="flex items-center gap-3.5">
        <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-[28px]">
          {kind.icon}
        </span>
        <div className="min-w-0 flex-1">
          <Badge tone="primary">{kind.label}</Badge>
          <h2 id="demande-objet" className="m-0 mt-1 text-[17px] font-black text-ink-900">
            {title}
          </h2>
        </div>
      </div>

      {requiredKit && (
        <p className="m-0 flex gap-2 text-[13px] font-bold text-ink-700">
          <span aria-hidden>🧰</span>
          <span>
            Kit requis : <strong>{requiredKit.name}</strong> · non inclus ({child.firstName} saisira le Kit Code livré
            avec le kit)
          </span>
        </p>
      )}

      {address}

      <dl className="m-0 flex flex-col gap-1.5 border-t-2 border-dashed border-ink-100 pt-2.5">
        {order ? (
          <>
            {order.items.map((item) => (
              <Line
                key={item.id}
                label={quantityLabel(item.title, item.quantity)}
                value={formatPrice(item.total)}
              />
            ))}
            {request.kind === "kit" && (
              <Line
                label={order.deliveryZone ? `Livraison · ${order.deliveryZone.name}` : "Livraison"}
                value={formatPrice(order.shippingFee)}
              />
            )}
            {order.taxes.map((tax) => (
              <Line key={tax.code} label={`${TAX_LABELS[tax.code]} (${tax.rate} %)`} value={formatPrice(tax.amount)} />
            ))}
          </>
        ) : (
          <>
            {request.kind === "kit" &&
              request.items.map((item) => (
                <Line
                  key={item.kitSlug}
                  label={quantityLabel(item.title, item.quantity)}
                  value={
                    item.quantity > 1
                      ? `${formatPriceHt(item.unitPrice)} l'unité`
                      : formatPriceHt(item.unitPrice)
                  }
                />
              ))}
            {request.taxes.length > 0 && <Line label="Sous-total HT" value={formatPrice(request.amount)} />}
            {request.taxes.map((tax) => (
              <Line key={tax.code} label={`${TAX_LABELS[tax.code]} (${tax.rate} %)`} value={formatPrice(tax.amount)} />
            ))}
          </>
        )}
        <div className="mt-1 flex items-baseline justify-between gap-4">
          <dt className="text-[15px] font-black text-ink-900">
            {amountLabel(request.kind, state, !!order)}
          </dt>
          <dd className="m-0 text-[22px] font-black text-primary-700">{formatPrice(order?.total ?? request.total)}</dd>
        </div>
      </dl>

      <p className="m-0 text-[13px] leading-normal font-bold text-ink-600">
        {request.kind === "kit"
          ? "Le kit est réservé pendant 30 minutes dès que vous passez au paiement. Les frais de livraison dépendent de la zone choisie."
          : `Le parcours est débloqué pour ${child.firstName} dès la confirmation du paiement.`}
      </p>
    </section>
  );
}
