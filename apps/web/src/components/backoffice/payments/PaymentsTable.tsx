import type { Schemas } from "@steamy/api-client";
import Link from "next/link";

import { formatDateTime, formatKpiValue } from "@/lib/backoffice/format";
import { failureLabel, ORDER_KIND } from "@/lib/backoffice/payments";
import { cx } from "@/lib/cx";
import { routes } from "@/lib/routes";

import { DataTable, type DataColumn } from "../DataTable";
import { FOCUS } from "../styles";
import { PaymentStatusBadge } from "./PaymentStatusBadge";

type Row = Schemas["PaymentRow"];

const dash = (value: string | null | undefined) => value || "—";

const COLUMNS: DataColumn<Row>[] = [
  { key: "createdAt", label: "Date", render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.createdAt)}</span> },
  {
    key: "orderReference",
    label: "Commande",
    render: (row) => (
      <Link href={routes.backoffice.payment(row.id)} className={cx("rounded-sm font-extrabold text-ink-900 underline", FOCUS)}>
        {row.orderReference}
        <span className="sr-only"> : voir le paiement {row.merchantReference}</span>
      </Link>
    ),
  },
  { key: "merchantReference", label: "Référence marchande", render: (row) => dash(row.merchantReference) },
  { key: "providerTransactionId", label: "Identifiant FedaPay", render: (row) => dash(row.providerTransactionId) },
  { key: "payer", label: "Payeur", render: (row) => dash(row.payer) },
  { key: "beneficiary", label: "Bénéficiaire", render: (row) => dash(row.beneficiary) },
  { key: "kind", label: "Type", render: (row) => (ORDER_KIND as Record<string, string>)[row.kind] ?? dash(row.kind) },
  { key: "network", label: "Pays · réseau", render: (row) => `${dash(row.country)} · ${dash(row.network)}` },
  { key: "maskedMsisdn", label: "Numéro", render: (row) => <span className="whitespace-nowrap">{dash(row.maskedMsisdn)}</span> },
  {
    key: "amount",
    label: "Montant",
    align: "right",
    render: (row) => <span className="whitespace-nowrap font-extrabold">{formatKpiValue(row.amount, "fcfa")}</span>,
  },
  { key: "status", label: "Statut", render: (row) => <PaymentStatusBadge status={row.status} /> },
  { key: "providerStatus", label: "Statut FedaPay", render: (row) => dash(row.providerStatus) },
  {
    key: "failureCode",
    label: "Motif d'échec",
    render: (row) => (
      <>
        {failureLabel(row.failureCode)}
        {row.failureReason && <span className="block text-xs text-ink-600">{row.failureReason}</span>}
      </>
    ),
  },
];

/** Tableau des paiements de la page ; chaque commande ouvre le détail du paiement. */
export function PaymentsTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      caption="Paiements Mobile Money"
      columns={COLUMNS}
      rows={rows}
      rowKey={(row) => String(row.id)}
      empty="Aucun paiement ne correspond à ces filtres."
      dense
    />
  );
}
