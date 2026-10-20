import Link from "next/link";

import { Avatar } from "@/components/ds/Avatar";
import { Badge } from "@/components/ds/Badge";
import { SkeletonBlock } from "@/components/ds/SkeletonBlock";
import { formatInstant } from "@/lib/dates";
import { routes } from "@/lib/routes";

import { getMyParent } from "./api";

/**
 * WD22 · Mon parent : nom, lien de parenté et lien validé (l'API ne sert que le parent dont le lien est établi), sans
 * numéro ni email. Pas de changement de parent depuis l'application (D41, D22) : l'aide renvoie vers le support.
 */
export async function ParentInfo() {
  const parent = await getMyParent();
  if (!parent) {
    return (
      <p className="m-0 rounded-[18px] border-2 border-ink-100 bg-surface p-5 text-sm font-bold text-ink-700">
        Aucun parent n&apos;est lié à ton compte pour l&apos;instant. Si c&apos;est une erreur,{" "}
        <Link
          href={routes.learner.help}
          className="rounded-sm font-black text-primary-600 underline-offset-2 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        >
          demande de l&apos;aide
        </Link>
        .
      </p>
    );
  }
  const name = `${parent.firstName} ${parent.lastName}`.trim();
  return (
    <>
      <section
        aria-labelledby="mon-parent"
        className="flex flex-wrap items-center gap-4 rounded-[18px] border-2 border-ink-100 bg-surface p-5"
      >
        <Avatar name={name} size={56} ring decorative />
        <div className="min-w-0 flex-1">
          <h3 id="mon-parent" className="m-0 text-base font-black text-ink-900">
            {name}
          </h3>
          <p className="m-0 text-[13px] font-bold text-ink-600">
            Lien de parenté : {parent.relationship.label} · depuis le {formatInstant(parent.linkedAt)}
          </p>
        </div>
        <Badge tone="success" icon="check">
          Lien validé
        </Badge>
      </section>
      <p className="m-0 flex items-start gap-3 rounded-[14px] border-2 border-primary-100 bg-primary-50 p-4 text-[13px] leading-normal font-bold text-ink-700">
        <span aria-hidden className="text-xl">
          🔒
        </span>
        Ton parent valide tes achats et tes participations aux événements, et reçoit un résumé de ta progression.
      </p>
    </>
  );
}

/** Squelette fidèle à WD22. */
export function ParentInfoSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement des informations de ton parent…" className="flex flex-col gap-4">
      <SkeletonBlock className="h-24 rounded-[18px]" />
      <SkeletonBlock className="h-16 rounded-[14px]" />
    </div>
  );
}
