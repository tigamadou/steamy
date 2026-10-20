import { redirect } from "next/navigation";

import { Button, Mascot, SkeletonBlock } from "@/components/ds";
import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";

import { NotificationList, type NotificationTab } from "./NotificationList";
import { NOTIFICATION_SPACES, type NotificationSpaceId } from "./spaces";

/** Notifications par page de WD04. */
export const NOTIFICATIONS_PAGE_SIZE = 20;

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Onglet et page lus dans l'URL ; une valeur invalide ramène à « Toutes » et à la page 1. */
export function parseNotificationParams(searchParams: SearchParams): { tab: NotificationTab; page: number } {
  const page = Number(first(searchParams.page));
  return {
    tab: first(searchParams.onglet) === "non-lues" ? "non-lues" : "toutes",
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/** WD05 · aucune notification : état vide, renvoi vers les préférences (WD06, ou WPD08 pour le parent). */
export function NotificationsEmpty({ space = "learner" }: { space?: NotificationSpaceId }) {
  const { preferences, text } = NOTIFICATION_SPACES[space];
  return (
    <section
      aria-labelledby="notifications-vide"
      className="mx-auto flex max-w-120 flex-col items-center gap-4 px-6 py-12 text-center"
    >
      <Mascot pose="sleep" size={180} hue="var(--primary-500)" />
      <h2 id="notifications-vide" className="m-0 mt-2 text-2xl font-black tracking-[-0.01em] text-ink-900">
        Tout est calme par ici
      </h2>
      <p className="m-0 text-sm leading-normal font-semibold text-ink-600">
        {text.empty}
      </p>
      <Button href={preferences} variant="outline" icon="gear" className="mt-2">
        Régler les notifications
      </Button>
    </section>
  );
}

/** Squelette de WD04 / WPD14 : onglets et cinq notifications. */
export function NotificationsSkeleton({ space = "learner" }: { space?: NotificationSpaceId }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={NOTIFICATION_SPACES[space].text.loading}
      className="mx-auto flex w-full max-w-180 flex-col gap-5"
    >
      <SkeletonBlock className="h-10 w-56 rounded-pill" />
      <div className="flex flex-col gap-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} className="h-21 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** WD04 / WD05 (apprenant) et WPD14 (parent) · notifications, lues côté serveur à chaque requête. */
export async function Notifications({
  searchParams,
  space = "learner",
}: {
  searchParams: Promise<SearchParams>;
  space?: NotificationSpaceId;
}) {
  const { tab, page } = parseNotificationParams(await searchParams);
  const api = await getServerApi();
  const [list, count] = await Promise.all([
    api.GET("/api/notifications/", {
      params: { query: { unread: tab === "non-lues" || undefined, page, pageSize: NOTIFICATIONS_PAGE_SIZE } },
    }),
    api.GET("/api/notifications/unread-count/"),
  ]);
  // Page au-delà de la dernière (après lecture ou URL saisie à la main) : retour à la première
  if (list.response.status === 404 && page > 1) redirect(NOTIFICATION_SPACES[space].list(tab));
  const data = readOrNull(list);
  const unread = readOrNull(count);
  if (!data || !unread) return null;
  const items = data.results ?? [];
  if (tab === "toutes" && items.length === 0 && page === 1) return <NotificationsEmpty space={space} />;
  return (
    <NotificationList
      key={`${tab}-${page}`}
      space={space}
      tab={tab}
      page={page}
      items={items}
      unreadCount={unread.count}
      hasNext={!!data.next}
    />
  );
}
