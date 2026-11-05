import { AdminContent, AdminHeader } from "@/components/backoffice/AdminHeader";
import { PaginationNav } from "@/components/backoffice/payments/PaginationNav";
import { PaymentFilters } from "@/components/backoffice/payments/PaymentFilters";
import { PaymentsTable } from "@/components/backoffice/payments/PaymentsTable";
import { PaymentTotals } from "@/components/backoffice/payments/PaymentTotals";
import { getServerApi } from "@/lib/api";
import { PAGE_GROUPS } from "@/lib/backoffice/access";
import { backofficeData } from "@/lib/backoffice/fetch";
import { requireGroups } from "@/lib/backoffice/guard";
import { apiQuery, parsePaymentFilters, paymentsHref } from "@/lib/backoffice/payments";
import { getCountries } from "@/lib/referentials";

export const metadata = { title: "Paiements · Back-office" };

/**
 * WAD11 · Paiements (Finance, Super-admin) : `GET backoffice/payments/`, filtres et page lus dans l'URL. Les totaux
 * portent sur tout le filtre ; les montants et statuts sont ceux de l'API, le numéro de téléphone est masqué par elle.
 */
export default async function PaymentsPage({ searchParams }: PageProps<"/backoffice/paiements">) {
  await requireGroups(PAGE_GROUPS.payments);
  const filters = parsePaymentFilters(await searchParams);
  const api = await getServerApi();
  const [payments, networks, countries] = await Promise.all([
    backofficeData(api.GET("/api/backoffice/payments/", { params: { query: apiQuery(filters) } })),
    backofficeData(api.GET("/api/referentials/payment-networks/")),
    getCountries(),
  ]);
  return (
    <>
      <AdminHeader title="Paiements" />
      <AdminContent>
        <div className="flex flex-col gap-4.5">
          <PaymentTotals totals={payments.totals} />
          <div>
            <PaymentFilters filters={filters} countries={countries} networks={networks} />
            <PaymentsTable rows={payments.results} />
            <PaginationNav
              page={filters.page}
              hasPrevious={payments.previous !== null}
              hasNext={payments.next !== null}
              hrefFor={(page) => paymentsHref({ ...filters, page })}
              summary={`${payments.count} paiement${payments.count > 1 ? "s" : ""}`}
            />
          </div>
        </div>
      </AdminContent>
    </>
  );
}
