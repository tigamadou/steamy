import type { Schemas } from "@steamy/api-client";

import { Button, Mascot, SectionHeader, SkeletonBlock, StatPill } from "@/components/ds";
import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";
import { routes } from "@/lib/routes";

import { ChildCard } from "./ChildCard";
import { PendingActionList } from "./PendingActionList";

type Child = Schemas["Child"];

/** Enfants lus pour l'accueil : une famille en compte rarement plus. */
export const HOME_CHILDREN_PAGE_SIZE = 50;

const p = routes.parent;

/** « Aucun enfant accompagné », « 1 enfant accompagné », « 2 enfants accompagnés ». */
export function childrenHeadline(count: number): string {
  if (count === 0) return "Aucun enfant accompagné pour l'instant";
  return `${count} enfant${count > 1 ? "s" : ""} accompagné${count > 1 ? "s" : ""} sur Steamy`;
}

function Hero({ count }: { count: number }) {
  return (
    <section
      aria-labelledby="accueil-parent"
      className="relative flex min-h-40 items-center gap-6 overflow-hidden rounded-[22px] bg-linear-135 from-primary-500 to-primary-700 px-5 py-6 text-white sm:px-7"
    >
      <div className="relative flex min-w-0 flex-1 flex-col gap-2 sm:max-w-[60%]">
        <p className="m-0 text-[11px] font-extrabold tracking-[0.08em] uppercase">Espace parent</p>
        <h2 id="accueil-parent" className="m-0 text-2xl leading-tight font-black tracking-[-0.01em] text-white">
          {childrenHeadline(count)}
        </h2>
        <p className="m-0 max-w-105 text-sm leading-normal font-semibold">
          Suivez leur progression, validez leurs demandes et réglez leurs achats en toute sécurité.
        </p>
        <div className="mt-3">
          <Button href={p.addChild} variant="amber" icon="plus">
            Ajouter un enfant
          </Button>
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute -top-2 right-2 hidden md:block">
        <Mascot pose="wave" size={160} hue="#fff" />
      </div>
    </section>
  );
}

/** Aucun enfant rattaché : CTA « Ajouter un enfant » (WPD04) ou acceptation d'une demande reçue. */
export function NoChild() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[18px] border-2 border-dashed border-primary-300 bg-primary-50 px-5 py-8 text-center">
      <Mascot pose="idle" size={110} />
      <p className="m-0 max-w-120 text-sm font-semibold text-ink-700">
        Créez le compte de votre enfant avec un identifiant et un mot de passe, ou acceptez la demande qu&apos;il vous a
        envoyée.
      </p>
      <Button href={p.addChild} icon="plus">
        Ajouter un enfant
      </Button>
    </div>
  );
}

/** WPD01 · contenu, une fois les données lues. */
export function ParentHomeView({
  kids,
  count,
  actions,
}: {
  kids: Child[];
  count: number;
  actions: Schemas["PendingAction"][];
}) {
  const courses = kids.reduce((total, child) => total + child.activeCourses, 0);
  return (
    <div className="flex flex-col gap-5">
      <Hero count={count} />
      <PendingActionList actions={actions} />
      <section aria-label="Vos statistiques" className="flex flex-col gap-4 sm:flex-row">
        <StatPill icon="user" label="Enfants" value={count} tone="primary" />
        <StatPill icon="rocket" label="Parcours en cours" value={courses} tone="success" />
        <StatPill icon="bell" label="À valider" value={actions.length} tone="amber" />
      </section>
      <section aria-labelledby="mes-enfants">
        <SectionHeader
          id="mes-enfants"
          title="Mes enfants"
          action={count > 0 ? { label: "Voir tout", href: p.children } : undefined}
        />
        {kids.length === 0 ? (
          <NoChild />
        ) : (
          <ul aria-label="Mes enfants" className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
            {kids.map((child) => (
              <li key={child.id}>
                <ChildCard child={child} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** WPD01 · accueil du parent : enfants et « À valider », lus côté serveur à chaque requête. */
export async function ParentHome() {
  const api = await getServerApi();
  const [children, actions] = await Promise.all([
    api.GET("/api/accounts/children/", { params: { query: { pageSize: HOME_CHILDREN_PAGE_SIZE } } }),
    api.GET("/api/accounts/pending-actions/"),
  ]);
  const list = readOrNull(children);
  const pending = readOrNull(actions);
  if (!list || !pending) return null;
  const results = list.results ?? [];
  return <ParentHomeView kids={results} count={list.count ?? results.length} actions={pending} />;
}

/** Squelette de WPD01 : bandeau, « À valider », pastilles et cartes des enfants. */
export function ParentHomeSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de votre espace…" className="flex flex-col gap-5">
      <SkeletonBlock className="h-40 rounded-[22px]" />
      <SkeletonBlock className="h-5 w-30 rounded-sm" />
      <SkeletonBlock className="h-22 rounded-[18px]" />
      <div className="flex flex-col gap-4 sm:flex-row">
        <SkeletonBlock className="h-16 rounded-lg" />
        <SkeletonBlock className="h-16 rounded-lg" />
        <SkeletonBlock className="h-16 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SkeletonBlock className="h-22 rounded-[18px]" />
        <SkeletonBlock className="h-22 rounded-[18px]" />
      </div>
    </div>
  );
}
