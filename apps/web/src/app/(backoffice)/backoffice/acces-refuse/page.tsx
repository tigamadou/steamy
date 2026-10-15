import Link from "next/link";

import { AdminContent, AdminHeader } from "@/components/backoffice/AdminHeader";
import { CARD, FOCUS } from "@/components/backoffice/styles";
import { requireStaff } from "@/lib/backoffice/guard";
import { routes } from "@/lib/routes";

export const metadata = { title: "Accès refusé · Back-office" };

/** Page d'un groupe du personnel qui n'est pas le sien (contrôle par page, `requireGroups`). */
export default async function AccessDeniedPage() {
  const me = await requireStaff();
  const groups = me.staffGroups.join(", ");
  return (
    <>
      <AdminHeader title="Accès refusé" />
      <AdminContent>
        <section className={`${CARD} max-w-xl`}>
          <h2 className="m-0 text-base font-black text-ink-900">Cette page n&apos;est pas ouverte à votre groupe</h2>
          <p className="m-0 mt-2 text-sm font-semibold leading-relaxed text-ink-600">
            {groups
              ? `Votre compte appartient au groupe ${groups}. Un Super-admin peut modifier vos droits si nécessaire.`
              : "Votre compte n'appartient à aucun groupe du personnel. Un Super-admin peut vous en attribuer un."}
          </p>
          <Link
            href={routes.backoffice.home}
            className={`mt-4 inline-flex items-center rounded-[10px] bg-ink-900 px-4 py-2.5 text-sm font-extrabold text-surface hover:bg-ink-800 ${FOCUS}`}
          >
            Retour à la vue d&apos;ensemble
          </Link>
        </section>
      </AdminContent>
    </>
  );
}
