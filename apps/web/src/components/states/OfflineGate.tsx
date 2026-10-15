"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { registerOf, STATE_ACTIONS } from "./messages";
import { OfflineState } from "./presets";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

const isOnline = () => navigator.onLine;
// Au rendu serveur, le visiteur est réputé en ligne : rien n'est affiché.
const isOnlineOnServer = () => true;

/**
 * WX01 : recouvre la page tant que le navigateur est hors ligne (événements `online` / `offline`), puis
 * recharge les données de la page (`router.refresh()`) au retour du réseau. Monté dans le layout racine,
 * il prend le registre de l'espace d'après l'URL.
 */
export function OfflineGate() {
  const online = useSyncExternalStore(subscribe, isOnline, isOnlineOnServer);
  const pathname = usePathname();
  const router = useRouter();
  const wentOffline = useRef(false);
  const [notice, setNotice] = useState<string>();
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!online) {
      wentOffline.current = true;
      return;
    }
    if (wentOffline.current) {
      wentOffline.current = false;
      setNotice(undefined);
      router.refresh();
    }
  }, [online, router]);

  // Le dialogue prend le focus : le lecteur d'écran annonce l'état, le clavier ne reste pas sur la page masquée.
  useEffect(() => {
    if (!online) {
      dialog.current?.focus();
    }
  }, [online]);

  if (online) {
    return null;
  }

  const retry = () => {
    if (navigator.onLine) {
      router.refresh();
    } else {
      setNotice(STATE_ACTIONS.stillOffline);
    }
  };

  return (
    <div
      ref={dialog}
      tabIndex={-1}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="hors-ligne-titre"
      className="fixed inset-0 z-50 flex overflow-y-auto bg-bg outline-none"
    >
      <OfflineState register={registerOf(pathname)} onRetry={retry} notice={notice} titleId="hors-ligne-titre" />
    </div>
  );
}
