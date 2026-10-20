"use client";

import { useEffect, useState, type ReactNode } from "react";

import type { ApiFailure } from "@/lib/api-call";

import { formatCountdown } from "./RetryCountdown";

/** Secondes restantes avant `until` (horodatage), arrondies au-dessus ; 0 une fois passé. */
function secondsLeft(until: number): number {
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

/**
 * Après `THROTTLED`, l'envoi reste bloqué le temps annoncé par l'API (`Retry-After`, jamais calculé côté front, D32),
 * avec un compte à rebours. Sans délai communiqué, rien n'est bloqué : le message d'erreur suffit.
 */
export function useThrottle() {
  const [until, setUntil] = useState(0);
  const [, setTick] = useState(0);
  const wait = secondsLeft(until);

  useEffect(() => {
    if (!until) return;
    const timer = window.setInterval(() => {
      setTick((n) => n + 1);
      if (secondsLeft(until) === 0) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [until]);

  return {
    /** Secondes d'attente restantes (0 : envoi possible). */
    wait,
    /** À appeler avec l'échec d'un envoi : bloque l'envoi si l'API a répondu `THROTTLED` avec un délai. */
    track(failure: Pick<ApiFailure, "code" | "retryAfter">) {
      if (failure.code === "THROTTLED" && failure.retryAfter) setUntil(Date.now() + failure.retryAfter * 1000);
    },
  };
}

/** Libellé d'un bouton d'envoi bloqué : « Réessayer dans 0:42 », ou le libellé normal. */
export function throttledLabel(wait: number, label: ReactNode): ReactNode {
  if (wait <= 0) return label;
  return (
    <>
      Réessayer dans <span className="tabular-nums">{formatCountdown(wait)}</span>
    </>
  );
}
