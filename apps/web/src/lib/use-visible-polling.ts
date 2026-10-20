"use client";

import { useEffect, useRef } from "react";

/**
 * Appelle `poll` toutes les `intervalMs` tant que `enabled` est vrai et que l'onglet est visible (WA02, WA04) : un
 * onglet masqué n'interroge pas l'API, et son retour au premier plan relance aussitôt une lecture. La fonction la plus
 * récente est toujours appelée, sans relancer le minuteur.
 */
export function useVisiblePolling(poll: () => void, intervalMs: number, enabled: boolean): void {
  const latest = useRef(poll);
  useEffect(() => {
    latest.current = poll;
  });

  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    const stop = () => {
      window.clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      if (timer === undefined) timer = window.setInterval(() => latest.current(), intervalMs);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        latest.current();
        start();
      } else {
        stop();
      }
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, intervalMs]);
}
