import { Button, SkeletonBlock } from "@/components/ds";
import { SavedToast } from "@/features/account/SavedToast";
import { FocusOnMount } from "@/features/parent/deletion/FocusOnMount";
import { NoChild } from "@/features/parent/home/ParentHome";
import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";
import { routes } from "@/lib/routes";

import { ChildRow, fullName, type ChildListItem } from "./ChildRow";

/** Enfants lus pour WPD02 : une famille en compte rarement plus (même borne que l'accueil). */
export const CHILDREN_PAGE_SIZE = 50;

/** Enfant dont la suppression vient d'être annulée (`?annulation=<id>`), ignoré si illisible. */
export function parseCancelled(value: string | string[] | undefined): number | null {
  const id = Array.isArray(value) ? value[0] : value;
  return id && /^\d+$/.test(id) ? Number(id) : null;
}

/**
 * WPD02 · contenu, une fois les données lues : demandes à examiner d'abord, puis les enfants (ordre de l'API). Après
 * « Annuler la suppression » (`cancelled`), la confirmation est annoncée et le focus revient à la ligne de l'enfant.
 */
export function ChildrenListView({ items, cancelled = null }: { items: ChildListItem[]; cancelled?: number | null }) {
  const restored = items.find((item) => item.kind === "child" && item.child.id === cancelled);
  return (
    <section aria-labelledby="vos-enfants" className="flex flex-col gap-4">
      {restored?.kind === "child" && (
        <>
          <SavedToast
            title={`La suppression du compte de ${fullName(restored.child)} est annulée : ${restored.child.firstName} peut de nouveau se connecter.`}
            clearParam="annulation"
          />
          <FocusOnMount targetId={`enfant-${restored.child.id}-ligne`} />
        </>
      )}
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
export async function ChildrenList({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
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
  return <ChildrenListView items={items} cancelled={parseCancelled((await searchParams).annulation)} />;
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
