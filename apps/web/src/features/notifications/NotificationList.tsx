"use client";

import type { Schemas } from "@steamy/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Icon, Mascot, NotifItem, Tabs, Toast } from "@/components/ds";
import { apiCall, errorMessage } from "@/lib/api-call";
import { formatRelative } from "@/lib/dates";
import { routes } from "@/lib/routes";
import { notifyNotificationsChanged } from "@/features/shell/unread-count";

import { notificationIcon, notificationTarget } from "./notification-icon";

type Notification = Schemas["Notification"];
export type NotificationTab = "toutes" | "non-lues";

export type NotificationListProps = {
  tab: NotificationTab;
  page: number;
  items: Notification[];
  unreadCount: number;
  hasNext: boolean;
};

const l = routes.learner;
const PAGE_LINK =
  "inline-flex items-center gap-1.5 rounded-pill border-2 border-ink-200 px-4 py-2 text-sm font-extrabold text-ink-800 hover:border-ink-300 focus-visible:outline-3 focus-visible:outline-primary-500";

/**
 * WD04 · liste des notifications : onglets « Toutes » / « Non lues (n) » dans l'URL, lecture au clic
 * (`POST notifications/{id}/read/`) puis navigation vers `url`, « Tout marquer comme lu », pagination. Chaque
 * changement du nombre de non-lues est signalé à la cloche du shell.
 */
export function NotificationList({ tab, page, items: initialItems, unreadCount, hasNext }: NotificationListProps) {
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
        setToast({ tone: "error", text: errorMessage(result, "tu") });
        return;
      }
      setItems((current) => current.map((n) => (n.id === notification.id ? result.data : n)));
      const next = Math.max(0, unread - 1);
      setUnread(next);
      notifyNotificationsChanged(next);
    }
    const target = notificationTarget(notification.url);
    if (target) router.push(target);
  }

  async function markAll() {
    setMarking(true);
    const result = await apiCall((api) => api.POST("/api/notifications/read-all/"));
    setMarking(false);
    if (!result.ok) {
      setToast({ tone: "error", text: errorMessage(result, "tu") });
      return;
    }
    const now = new Date().toISOString();
    // Onglet « Non lues » : plus rien à y montrer
    setItems((current) => (tab === "non-lues" ? [] : current.map((n) => ({ ...n, readAt: n.readAt ?? now }))));
    setUnread(0);
    notifyNotificationsChanged(0);
    setToast({ tone: "success", text: "Toutes tes notifications sont lues." });
  }

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label="Filtrer les notifications"
          activeHref={l.notificationList(tab)}
          items={[
            { href: l.notificationList("toutes"), label: "Toutes" },
            { href: l.notificationList("non-lues"), label: `Non lues (${unread})` },
          ]}
        />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={markAll} loading={marking} disabled={unread === 0}>
            Tout marquer comme lu
          </Button>
          <Link
            href={l.notificationPreferences}
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
          <p className="m-0 text-sm font-semibold text-ink-600">Tu as tout lu, rien de neuf.</p>
          <Link href={l.notificationList("toutes")} className="text-sm font-extrabold text-primary-600 underline">
            Voir toutes mes notifications
          </Link>
        </div>
      ) : (
        <ul aria-label="Notifications" className="flex flex-col gap-2.5">
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
            <Link href={l.notificationList(tab, page - 1)} className={PAGE_LINK} rel="prev">
              <Icon name="arrow-left" size={16} strokeWidth={2.5} />
              Précédent
            </Link>
          )}
          <p className="m-0 text-sm font-bold text-ink-600" aria-current="page">
            Page {page}
          </p>
          {hasNext && (
            <Link href={l.notificationList(tab, page + 1)} className={PAGE_LINK} rel="next">
              Suivant
              <Icon name="arrow-right" size={16} strokeWidth={2.5} />
            </Link>
          )}
        </nav>
      )}

      {toast && <Toast tone={toast.tone} title={toast.text} onClose={() => setToast(null)} />}
    </div>
  );
}
