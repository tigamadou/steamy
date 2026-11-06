"use client";

import type { Schemas } from "@steamy/api-client";
import Link from "next/link";
import { useState } from "react";

import { formatDateTime, formatKpiValue } from "@/lib/backoffice/format";
import { REFUND_TABS, refundsHref, type RefundTab } from "@/lib/backoffice/payments";
import { cx } from "@/lib/cx";
import { routes } from "@/lib/routes";

import { DataTable, type DataColumn } from "../DataTable";
import { FOCUS } from "../styles";
import { ProcessRefundModal, type RefundFeedback } from "./ProcessRefundModal";

type Refund = Schemas["BackofficeRefund"];

const dash = (value: string | null | undefined) => value || "—";

/** Onglets « À traiter » / « Traités » : des liens adressables en encre, l'onglet courant porte `aria-current`. */
export function RefundTabs({ tab }: { tab: RefundTab }) {
  return (
    <nav aria-label="Remboursements" className="max-w-full overflow-x-auto">
      <ul className="m-0 inline-flex list-none gap-0.5 rounded-[10px] bg-ink-100 p-0.75">
        {(Object.keys(REFUND_TABS) as RefundTab[]).map((id) => (
          <li key={id}>
            <Link
              href={refundsHref(id, 1)}
              aria-current={id === tab ? "page" : undefined}
              className={cx(
                "block rounded-lg px-3.5 py-1.75 text-xs font-extrabold whitespace-nowrap no-underline",
                FOCUS,
                id === tab ? "bg-surface text-ink-900 shadow-pop-sm" : "text-ink-600 hover:text-ink-900",
              )}
            >
              {REFUND_TABS[id].label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Liste des remboursements d'un onglet ; « Marquer comme remboursé » n'existe que dans « À traiter ». */
export function RefundsTable({ rows, tab }: { rows: Refund[]; tab: RefundTab }) {
  const processed = REFUND_TABS[tab].processed;
  const [feedback, setFeedback] = useState<RefundFeedback | null>(null);

  const columns: DataColumn<Refund>[] = [
    { key: "createdAt", label: "Demandé le", render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.createdAt)}</span> },
    {
      key: "orderReference",
      label: "Commande",
      render: (row) => (
        <Link href={routes.backoffice.payment(row.paymentId)} className={cx("rounded-sm font-extrabold text-ink-900 underline", FOCUS)}>
          {row.orderReference}
        </Link>
      ),
    },
    {
      key: "amount",
      label: "Montant",
      align: "right",
      render: (row) => <span className="whitespace-nowrap font-extrabold">{formatKpiValue(row.amount, "fcfa")}</span>,
    },
    { key: "reason", label: "Motif" },
    { key: "payer", label: "Payeur", render: (row) => dash(row.payer) },
    ...(processed
      ? ([
          { key: "reference", label: "Référence", render: (row) => dash(row.reference) },
          { key: "processedBy", label: "Traité par", render: (row) => dash(row.processedBy) },
          { key: "processedAt", label: "Traité le", render: (row) => (row.processedAt ? formatDateTime(row.processedAt) : "—") },
        ] satisfies DataColumn<Refund>[])
      : ([
          { key: "action", label: "Action", render: (row) => <ProcessRefundModal refund={row} onDone={setFeedback} /> },
        ] satisfies DataColumn<Refund>[])),
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Régions live présentes dès le rendu : leur contenu, et non leur apparition, est annoncé */}
      <p role="status" className="m-0 text-sm font-bold text-ink-800 empty:hidden">
        {feedback?.tone === "info" && feedback.text}
      </p>
      <p role="alert" className="m-0 text-sm font-bold text-error-700 empty:hidden">
        {feedback?.tone === "error" && feedback.text}
      </p>
      <DataTable
        caption={processed ? "Remboursements traités" : "Remboursements à traiter"}
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        empty={processed ? "Aucun remboursement traité." : "Aucun remboursement à traiter."}
        dense
      />
    </div>
  );
}
