"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { apiCall } from "@/lib/api-call";

/** Intervalle de rafraîchissement du compteur, onglet visible seulement (pas de websocket, S11). */
export const UNREAD_REFRESH_MS = 60_000;

/** Événement émis par les écrans qui changent l'état de lecture (WD04 : lecture, « Tout marquer comme lu »). */
export const NOTIFICATIONS_CHANGED = "steamy:notifications-changed";

/** Prévient le shell que le nombre de non-lues a changé (`count` connu, sinon relu dans l'API). */
export function notifyNotificationsChanged(count?: number): void {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED, { detail: count }));
}

/** Nombre de non-lues lu dans l'API, `undefined` si la lecture échoue (la valeur connue est gardée). */
async function readCount(): Promise<number | undefined> {
  const result = await apiCall((api) => api.GET("/api/notifications/unread-count/"));
  return result.ok ? result.data.count : undefined;
}

/**
 * Compteur de non-lues du shell : valeur rendue par le serveur, relue à chaque navigation, toutes les 60 s quand
 * l'onglet est visible, au retour sur l'onglet et quand un écran signale un changement.
 */
export function useUnreadCount(initial: number): number {
  const pathname = usePathname();
  const [count, setCount] = useState(initial);
  const [seen, setSeen] = useState(initial);
  // Nouvelle valeur du serveur (router.refresh()) : elle remplace la valeur locale.
  if (initial !== seen) {
    setSeen(initial);
    setCount(initial);
  }

  useEffect(() => {
    let current = true;
    void readCount().then((value) => {
      if (current && value !== undefined) setCount(value);
    });
    return () => {
      current = false;
    };
  }, [pathname]);

  useEffect(() => {
    const refresh = () =>
      void readCount().then((value) => {
        if (value !== undefined) setCount(value);
      });
    const tick = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = window.setInterval(tick, UNREAD_REFRESH_MS);
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<number | undefined>).detail;
      if (typeof detail === "number") setCount(detail);
      else refresh();
    };
    document.addEventListener("visibilitychange", tick);
    window.addEventListener(NOTIFICATIONS_CHANGED, onChanged);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener(NOTIFICATIONS_CHANGED, onChanged);
    };
  }, []);

  return count;
}
