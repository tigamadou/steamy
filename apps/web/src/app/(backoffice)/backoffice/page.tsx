import { AdminContent, AdminHeader } from "@/components/backoffice/AdminHeader";
import { PendingPanel } from "@/components/backoffice/PendingPanel";
import { PAGE_GROUPS } from "@/lib/backoffice/access";
import { requireGroups } from "@/lib/backoffice/guard";

export const metadata = { title: "Vue d'ensemble · Back-office" };

/** WAD01 · Vue d'ensemble (tout le personnel). Contenu livré à l'étape 6.7 avec `GET backoffice/overview/`. */
export default async function OverviewPage() {
  const me = await requireGroups(PAGE_GROUPS.overview);
  return (
    <>
      <AdminHeader title="Vue d'ensemble" />
      <AdminContent>
        <PendingPanel
          kicker={me.firstName ? `Bonjour ${me.firstName}` : "Bonjour"}
          title="Synthèse en préparation"
          text="Les chiffres clés de la plateforme, la prochaine échéance du rapport et la liste « À traiter » s'afficheront ici."
        />
      </AdminContent>
    </>
  );
}
