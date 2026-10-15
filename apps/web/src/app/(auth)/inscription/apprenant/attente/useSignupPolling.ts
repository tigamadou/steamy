"use client";

import { useEffect, useState } from "react";

import { apiCall } from "@/lib/api-call";

import type { SignupState } from "../signup-steps";

/** Intervalle de W07 (LOT-2-AUTH 2.4) et plafond du recul après des erreurs réseau. */
export const POLL_INTERVAL_MS = 15_000;
export const MAX_BACKOFF_MS = 120_000;

/**
 * Suit l'état de l'inscription en cours (`GET auth/learner-signup/`) tant qu'elle attend l'accord du parent :
 * toutes les 15 s, suspendu quand l'onglet est caché (relancé à son retour), arrêté sur un autre état, avec un
 * recul progressif en cas d'erreur (réseau faible).
 */
export function useSignupPolling(initial: SignupState): SignupState {
  const [state, setState] = useState(initial);
  const waiting = state.step === "waiting";

  useEffect(() => {
    if (!waiting) return;
    let timer: number | undefined;
    let delay = POLL_INTERVAL_MS;
    let stopped = false;

    const schedule = () => {
      window.clearTimeout(timer);
      if (!stopped && document.visibilityState === "visible") timer = window.setTimeout(poll, delay);
    };

    const poll = async () => {
      const result = await apiCall((api) => api.GET("/api/auth/learner-signup/"));
      if (stopped) return;
      if (result.ok) {
        delay = POLL_INTERVAL_MS;
        setState(result.data);
        if (result.data.step !== "waiting") return;
      } else {
        delay = Math.min(delay * 2, MAX_BACKOFF_MS);
      }
      schedule();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timer);
        void poll();
      } else {
        window.clearTimeout(timer);
      }
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [waiting]);

  return state;
}
