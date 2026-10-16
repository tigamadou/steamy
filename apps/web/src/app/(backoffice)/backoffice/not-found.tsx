import Link from "next/link";

import { AdminContent, AdminHeader } from "@/components/backoffice/AdminHeader";
import { CARD, FOCUS } from "@/components/backoffice/styles";
import { routes } from "@/lib/routes";

/** 404 du back-office (`notFound()`, ex. indicateur inconnu de WAD03), dans le shell et au registre neutre. */
export default function BackofficeNotFound() {
  return (
    <>
      <AdminHeader title="Page introuvable" />
      <AdminContent>
        <section className={`${CARD} max-w-xl`}>
          <h2 className="m-0 text-base font-black text-ink-900">Cette page n&apos;existe pas ou plus</h2>
          <p className="m-0 mt-2 text-sm font-semibold leading-relaxed text-ink-600">
            Le lien suivi est peut-être incomplet, ou l&apos;élément demandé a été retiré.
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
