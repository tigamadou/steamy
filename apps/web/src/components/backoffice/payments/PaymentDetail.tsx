import type { Schemas } from "@steamy/api-client";
import Link from "next/link";
import type { ReactNode } from "react";

import { Breadcrumb } from "@/components/ds/Breadcrumb";
import { formatDateTime, formatKpiValue } from "@/lib/backoffice/format";
import { AUDIT_ACTIONS, failureLabel, labelOf, ORDER_KIND, ORDER_STATUS } from "@/lib/backoffice/payments";
import { cx } from "@/lib/cx";
import { routes } from "@/lib/routes";

import { DataTable, type DataColumn } from "../DataTable";
import { SectionHead } from "../SectionHead";
import { CARD, FOCUS } from "../styles";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { RecheckButton } from "./RecheckButton";
import { RefundRequestModal } from "./RefundRequestModal";

type Payment = Schemas["PaymentDetail"];

const fcfa = (amount: number) => formatKpiValue(amount, "fcfa");
const dash = (value: string | null | undefined) => value || "—";

function Facts({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <dl className="m-0 grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-5 gap-y-2.5 text-[13px]">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="font-bold text-ink-600">{label}</dt>
          <dd className="m-0 min-w-0 font-semibold break-words text-ink-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const ATTEMPT_COLUMNS: DataColumn<Payment["attempts"][number]>[] = [
  { key: "createdAt", label: "Date", render: (row) => formatDateTime(row.createdAt) },
  {
    key: "merchantReference",
    label: "Référence marchande",
    render: (row) => (
      <Link href={routes.backoffice.payment(row.id)} className={cx("rounded-sm font-extrabold text-ink-900 underline", FOCUS)}>
        {row.merchantReference}
      </Link>
    ),
  },
  { key: "status", label: "Statut", render: (row) => <PaymentStatusBadge status={row.status} /> },
  { key: "failureCode", label: "Motif d'échec", render: (row) => failureLabel(row.failureCode) },
  { key: "amount", label: "Montant", align: "right", render: (row) => fcfa(row.amount) },
];

const REFUND_COLUMNS: DataColumn<Payment["refunds"][number]>[] = [
  { key: "createdAt", label: "Demandé le", render: (row) => formatDateTime(row.createdAt) },
  { key: "amount", label: "Montant", align: "right", render: (row) => fcfa(row.amount) },
  { key: "reason", label: "Motif" },
  { key: "processed", label: "État", render: (row) => (row.processed ? "Fait" : "À traiter") },
  { key: "reference", label: "Référence", render: (row) => dash(row.reference) },
  {
    key: "processedBy",
    label: "Traité par",
    render: (row) => (row.processed ? `${dash(row.processedBy)}${row.processedAt ? `, le ${formatDateTime(row.processedAt)}` : ""}` : "—"),
  },
];

const AUDIT_COLUMNS: DataColumn<Payment["auditLog"][number]>[] = [
  { key: "createdAt", label: "Date", render: (row) => formatDateTime(row.createdAt) },
  { key: "action", label: "Action", render: (row) => labelOf(AUDIT_ACTIONS, row.action) },
  { key: "actor", label: "Auteur", render: (row) => dash(row.actor) },
];

/** WAD16 · Fiche d'un paiement : tentatives, remboursements et journal, avec « Revérifier » et « Demander un remboursement ». */
export function PaymentDetail({ payment }: { payment: Payment }) {
  const failure = payment.failureCode || payment.failureReason;
  return (
    <div className="flex flex-col gap-4.5">
      <Breadcrumb
        tone="ink"
        items={[{ label: "Paiements", href: routes.backoffice.payments }, { label: payment.orderReference }]}
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <section aria-labelledby="paiement-carte" className={CARD}>
          <SectionHead id="paiement-carte" title="Paiement" sub={`Créé le ${formatDateTime(payment.createdAt)}`} right={<PaymentStatusBadge status={payment.status} />} />
          <Facts
            items={[
              ["Montant", fcfa(payment.amount)],
              ["Frais FedaPay", payment.providerFees === null ? "—" : fcfa(payment.providerFees)],
              ["Statut FedaPay", dash(payment.providerStatus)],
              ["Dernière vérification", payment.checkedAt ? formatDateTime(payment.checkedAt) : "Jamais"],
              ["Confirmé le", payment.confirmedAt ? formatDateTime(payment.confirmedAt) : "—"],
              [
                "Motif d'échec",
                failure ? (
                  <>
                    {failureLabel(payment.failureCode)}
                    {payment.failureReason && <span className="block text-ink-600">{payment.failureReason}</span>}
                  </>
                ) : (
                  "—"
                ),
              ],
              ["Référence marchande", payment.merchantReference],
              ["Identifiant FedaPay", dash(payment.providerTransactionId)],
              ["Pays · réseau", `${dash(payment.country)} · ${dash(payment.network)}`],
              ["Numéro", dash(payment.maskedMsisdn)],
              ["Reste remboursable", fcfa(payment.refundable)],
            ]}
          />
          <div className="mt-4 flex flex-wrap items-start gap-3">
            <RecheckButton paymentId={payment.id} status={payment.status} />
            <RefundRequestModal paymentId={payment.id} status={payment.status} refundable={payment.refundable} />
          </div>
        </section>

        <section aria-labelledby="paiement-commande" className={CARD}>
          <SectionHead id="paiement-commande" title="Commande" />
          <Facts
            items={[
              ["Référence", payment.order.reference],
              ["Type", labelOf(ORDER_KIND, payment.order.kind)],
              ["Statut", labelOf(ORDER_STATUS, payment.order.status)],
              ["Total", fcfa(payment.order.total)],
              ["Payeur", dash(payment.order.payer)],
              ["Bénéficiaire", dash(payment.order.beneficiary)],
            ]}
          />
        </section>
      </div>

      <section aria-labelledby="paiement-tentatives">
        <SectionHead id="paiement-tentatives" title="Autres tentatives" sub="Autres paiements de la même commande" />
        <DataTable caption="Autres tentatives" columns={ATTEMPT_COLUMNS} rows={payment.attempts} rowKey={(row) => String(row.id)} empty="Aucune autre tentative." dense />
      </section>

      <section aria-labelledby="paiement-remboursements">
        <SectionHead id="paiement-remboursements" title="Remboursements" />
        <DataTable caption="Remboursements du paiement" columns={REFUND_COLUMNS} rows={payment.refunds} rowKey={(row) => String(row.id)} empty="Aucun remboursement." dense />
      </section>

      <section aria-labelledby="paiement-journal">
        <SectionHead id="paiement-journal" title="Journal" sub="Actions sur ce paiement et sur sa commande" />
        <DataTable caption="Journal du paiement" columns={AUDIT_COLUMNS} rows={payment.auditLog} rowKey={(row) => String(row.id)} empty="Aucune entrée dans le journal." dense />
      </section>
    </div>
  );
}
