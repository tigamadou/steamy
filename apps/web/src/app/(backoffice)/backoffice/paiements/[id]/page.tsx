import { notFound } from "next/navigation";

import { AdminContent, AdminHeader } from "@/components/backoffice/AdminHeader";
import { PaymentDetail } from "@/components/backoffice/payments/PaymentDetail";
import { getServerApi } from "@/lib/api";
import { PAGE_GROUPS } from "@/lib/backoffice/access";
import { backofficeData } from "@/lib/backoffice/fetch";
import { requireGroups } from "@/lib/backoffice/guard";

export const metadata = { title: "Paiement · Back-office" };

/** WAD16 · Détail d'un paiement (Finance, Super-admin) : `GET backoffice/payments/{id}/` ; identifiant non numérique ou inconnu : 404. */
export default async function PaymentDetailPage({ params }: PageProps<"/backoffice/paiements/[id]">) {
  await requireGroups(PAGE_GROUPS.payments);
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const api = await getServerApi();
  const payment = await backofficeData(api.GET("/api/backoffice/payments/{id}/", { params: { path: { id: Number(id) } } }));
  return (
    <>
      <AdminHeader title={`Paiement ${payment.orderReference}`} />
      <AdminContent>
        <PaymentDetail payment={payment} />
      </AdminContent>
    </>
  );
}
