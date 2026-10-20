import type { Schemas } from "@steamy/api-client";
import Link from "next/link";

import { Avatar, Icon } from "@/components/ds";
import { routes } from "@/lib/routes";

type Child = Schemas["Child"];

/** « 13 ans · 4ᵉ » : âge et classe connus. */
export function childMeta({ age, schoolGrade }: Pick<Child, "age" | "schoolGrade">): string {
  return [age !== null ? `${age} ans` : null, schoolGrade?.label].filter(Boolean).join(" · ");
}

/** « Aucun parcours en cours », « 1 parcours en cours », « 3 parcours en cours » (nombre lu dans l'API). */
export function activeCoursesLabel(count: number): string {
  return count === 0 ? "Aucun parcours en cours" : `${count} parcours en cours`;
}

/** Carte d'un enfant de WPD01 : avatar, prénom, âge · classe, parcours en cours ; toute la carte mène à WPD03. */
export function ChildCard({ child }: { child: Child }) {
  const name = `${child.firstName} ${child.lastName}`.trim();
  const meta = childMeta(child);
  return (
    <Link
      href={routes.parent.child(child.id)}
      className="group flex items-center gap-3 rounded-[18px] border-[1.5px] border-ink-100 bg-surface p-4.5 hover:border-ink-200 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
    >
      <Avatar name={name} emoji={child.avatar?.emoji} size={48} ring decorative />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-black text-ink-900">{name}</span>
        {meta && <span className="text-xs font-bold text-ink-600">{meta}</span>}
        <span className="mt-1 text-xs font-bold text-ink-700">{activeCoursesLabel(child.activeCourses)}</span>
      </span>
      <Icon name="chevron-right" size={18} className="text-ink-500 group-hover:text-ink-700" />
    </Link>
  );
}
