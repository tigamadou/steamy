import { Button, SkeletonBlock } from "@/components/ds";
import { NoChild } from "@/features/parent/home/ParentHome";
import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";
import { routes } from "@/lib/routes";

import { ChildRow, type ChildListItem } from "./ChildRow";

/** Enfants lus pour WPD02 : une famille en compte rarement plus (même borne que l'accueil). */
export const CHILDREN_PAGE_SIZE = 50;

/** WPD02 · contenu, une fois les données lues : demandes à examiner d'abord, puis les enfants (ordre de l'API). */
export function ChildrenListView({ items }: { items: ChildListItem[] }) {
  return (
    <section aria-labelledby="vos-enfants" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="vos-enfants" className="m-0 text-lg font-black tracking-[-0.01em] text-ink-900">
          Vos enfants
        </h2>
        <Button href={routes.parent.addChild} icon="plus">
          Ajouter un enfant
        </Button>
      </div>
      {items.length === 0 ? (
        <NoChild />
      ) : (
        <ul aria-label="Vos enfants" className="m-0 flex list-none flex-col gap-3 p-0">
          {items.map((item) => (
            <li key={item.kind === "consent" ? `demande-${item.action.id}` : `enfant-${item.child.id}`}>
              <ChildRow item={item} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * WPD02 · Mes enfants : les enfants rattachés (`accounts/children/`) et les demandes de consentement reçues, encore
 * sans enfant rattaché (`accounts/pending-actions/`, type `consent`, D50).
 */
export async function ChildrenList() {
  const api = await getServerApi();
  const [children, actions] = await Promise.all([
    api.GET("/api/accounts/children/", { params: { query: { pageSize: CHILDREN_PAGE_SIZE } } }),
    api.GET("/api/accounts/pending-actions/"),
  ]);
  const list = readOrNull(children);
  const pending = readOrNull(actions);
  if (!list || !pending) return null;
  const items: ChildListItem[] = [
    ...pending.filter((action) => action.type === "consent").map((action) => ({ kind: "consent" as const, action })),
    ...(list.results ?? []).map((child) => ({ kind: "child" as const, child })),
  ];
  return <ChildrenListView items={items} />;
}

/** Squelette de WPD02. */
export function ChildrenListSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de vos enfants…" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-6 w-30 rounded-sm" />
        <SkeletonBlock className="h-12 w-48 rounded-lg" />
      </div>
      <SkeletonBlock className="h-24 rounded-[18px]" />
      <SkeletonBlock className="h-24 rounded-[18px]" />
    </div>
  );
}
