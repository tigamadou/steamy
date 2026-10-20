"use client";

import type { Schemas } from "@steamy/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Icon, Mascot, NotifItem, Tabs, Toast } from "@/components/ds";
import { apiCall, errorMessage } from "@/lib/api-call";
import { formatRelative } from "@/lib/dates";
import type { NotificationTab } from "@/lib/routes";
import { useFocusOnChange } from "@/lib/use-focus-on-change";
import { notifyNotificationsChanged } from "@/features/shell/unread-count";

import { notificationIcon } from "./notification-icon";
import { NOTIFICATION_SPACES, type NotificationSpaceId } from "./spaces";

type Notification = Schemas["Notification"];
export type { NotificationTab };

export type NotificationListProps = {
  /** Espace affiché : apprenant (WD04, par défaut) ou parent (WPD14). */
  space?: NotificationSpaceId;
  tab: NotificationTab;
  page: number;
  items: Notification[];
  unreadCount: number;
  hasNext: boolean;
};

const PAGE_LINK =
  "inline-flex items-center gap-1.5 rounded-pill border-2 border-ink-200 px-4 py-2 text-sm font-extrabold text-ink-800 hover:border-ink-300 focus-visible:outline-3 focus-visible:outline-primary-500";

/**
 * WD04 / WPD14 · liste des notifications : onglets « Toutes » / « Non lues (n) » dans l'URL, lecture au clic
 * (`POST notifications/{id}/read/`) puis navigation vers `url`, « Tout marquer comme lu », pagination. Chaque
 * changement du nombre de non-lues est signalé à la cloche du shell.
 */
export function NotificationList({
  space: spaceId = "learner",
  tab,
  page,
  items: initialItems,
  unreadCount,
  hasNext,
}: NotificationListProps) {
  const space = NOTIFICATION_SPACES[spaceId];
  // Nouvelle page ou nouvel onglet : le focus passe à la liste
  const list = useFocusOnChange<HTMLUListElement>("notifications", `${tab}-${page}`);
  // Toast fermé alors qu'il avait le focus : le focus passe au contenu principal, pas à `body` (WCAG 2.4.3)
  const closeToast = () => {
    const hadFocus = document.activeElement?.closest("[data-toast]") != null;
    setToast(null);
    if (hadFocus) document.getElementById("contenu")?.focus();
  };
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [unread, setUnread] = useState(unreadCount);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [marking, setMarking] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function open(notification: Notification) {
    if (notification.readAt === null) {
      setBusyId(notification.id);
      const result = await apiCall((api) =>
        api.POST("/api/notifications/{id}/read/", { params: { path: { id: notification.id } } }),
      );
      setBusyId(null);
      if (!result.ok) {
        setToast({ tone: "error", text: errorMessage(result, space.register) });
        return;
      }
      setItems((current) => current.map((n) => (n.id === notification.id ? result.data : n)));
      const next = Math.max(0, unread - 1);
      setUnread(next);
      notifyNotificationsChanged(next);
    }
    const target = space.href(notification);
    if (target) router.push(target);
  }

  async function markAll() {
    setMarking(true);
    const result = await apiCall((api) => api.POST("/api/notifications/read-all/"));
    setMarking(false);
    if (!result.ok) {
      setToast({ tone: "error", text: errorMessage(result, space.register) });
      return;
    }
    const now = new Date().toISOString();
    // Onglet « Non lues » : plus rien à y montrer
    setItems((current) => (tab === "non-lues" ? [] : current.map((n) => ({ ...n, readAt: n.readAt ?? now }))));
    setUnread(0);
    notifyNotificationsChanged(0);
    setToast({ tone: "success", text: space.text.allRead });
  }

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label="Filtrer les notifications"
          activeHref={space.list(tab)}
          items={[
            { href: space.list("toutes"), label: "Toutes" },
            { href: space.list("non-lues"), label: `Non lues (${unread})` },
          ]}
        />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={markAll} loading={marking} disabled={unread === 0}>
            Tout marquer comme lu
          </Button>
          <Link
            href={space.preferences}
            aria-label="Régler les notifications"
            className="flex size-10 items-center justify-center rounded-md text-ink-700 hover:bg-ink-100 focus-visible:outline-3 focus-visible:outline-primary-500"
          >
            <Icon name="gear" size={18} />
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <Mascot pose="idle" size={120} hue="var(--primary-500)" />
          <p className="m-0 text-sm font-semibold text-ink-600">{space.text.nothingUnread}</p>
          <Link href={space.list("toutes")} className="text-sm font-extrabold text-primary-600 underline">
            Voir toutes mes notifications
          </Link>
        </div>
      ) : (
        <ul ref={list} tabIndex={-1} aria-label="Notifications" className="flex flex-col gap-2.5 outline-none">
          {items.map((notification) => (
            <li key={notification.id}>
              <NotifItem
                icon={notificationIcon(notification)}
                tone={notification.tone}
                title={notification.title}
                message={notification.message || undefined}
                time={formatRelative(notification.createdAt)}
                dateTime={notification.createdAt}
                unread={notification.readAt === null}
                busy={busyId === notification.id}
                onSelect={() => void open(notification)}
              />
            </li>
          ))}
        </ul>
      )}

      {(page > 1 || hasNext) && (
        <nav aria-label="Pagination des notifications" className="flex items-center justify-center gap-3">
          {page > 1 && (
            <Link href={space.list(tab, page - 1)} className={PAGE_LINK} rel="prev">
              <Icon name="arrow-left" size={16} strokeWidth={2.5} />
              Précédent
            </Link>
          )}
          <p className="m-0 text-sm font-bold text-ink-600" aria-current="page">
            Page {page}
          </p>
          {hasNext && (
            <Link href={space.list(tab, page + 1)} className={PAGE_LINK} rel="next">
              Suivant
              <Icon name="arrow-right" size={16} strokeWidth={2.5} />
            </Link>
          )}
        </nav>
      )}

      {toast && <Toast tone={toast.tone} title={toast.text} onClose={closeToast} />}
    </div>
  );
}
