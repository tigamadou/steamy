import { AdminContent, AdminHeader } from "@/components/backoffice/AdminHeader";
import { PaginationNav } from "@/components/backoffice/payments/PaginationNav";
import { RefundsTable, RefundTabs } from "@/components/backoffice/payments/RefundsTable";
import { getServerApi } from "@/lib/api";
import { PAGE_GROUPS } from "@/lib/backoffice/access";
import { backofficeData } from "@/lib/backoffice/fetch";
import { requireGroups } from "@/lib/backoffice/guard";
import { parseRefundsTab, REFUND_TABS, refundsHref } from "@/lib/backoffice/payments";

export const metadata = { title: "Remboursements · Back-office" };

/**
 * WAD17 · Remboursements (Finance, Super-admin) : `GET backoffice/refunds/?processed=`, onglet et page lus dans l'URL.
 * « À traiter » par défaut ; « Marquer comme remboursé » vit dans la ligne.
 */
export default async function RefundsPage({ searchParams }: PageProps<"/backoffice/remboursements">) {
  await requireGroups(PAGE_GROUPS.refunds);
  const { tab, page } = parseRefundsTab(await searchParams);
  const api = await getServerApi();
  const refunds = await backofficeData(
    api.GET("/api/backoffice/refunds/", { params: { query: { processed: REFUND_TABS[tab].processed, page } } }),
  );
  return (
    <>
      <AdminHeader title="Remboursements" actions={<RefundTabs tab={tab} />} />
      <AdminContent>
        <RefundsTable rows={refunds.results} tab={tab} />
        <PaginationNav
          page={page}
          hasPrevious={refunds.previous !== null}
          hasNext={refunds.next !== null}
          hrefFor={(target) => refundsHref(tab, target)}
          summary={`${refunds.count} remboursement${refunds.count > 1 ? "s" : ""}`}
        />
      </AdminContent>
    </>
  );
}
