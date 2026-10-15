"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { RESTART_NOTICE, useResetFlow } from "./ResetFlow";

/** Renvoie à WL02 (avec un message) quand l'étape est ouverte sans l'état attendu ; vrai si l'étape peut s'afficher. */
export function useFlowGuard(ready: boolean): boolean {
  const router = useRouter();
  const { update } = useResetFlow();
  useEffect(() => {
    if (ready) return;
    update({ notice: RESTART_NOTICE });
    router.replace("/mot-de-passe-oublie");
  }, [ready, router, update]);
  return ready;
}
