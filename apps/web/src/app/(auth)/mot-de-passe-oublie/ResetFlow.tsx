"use client";

import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";

import type { OtpChallenge } from "@/components/auth/OtpForm";

/**
 * État du parcours WL02 → WL05, en mémoire du layout : `challengeId` et `resetToken` ne vont jamais dans l'URL ni
 * dans le stockage du navigateur. Un rechargement le vide : l'écran concerné renvoie à WL02 avec un message.
 */
export type ResetFlowState = {
  /** Canal du code : SMS (parent) ou email (enseignant, C6). */
  channel: "sms" | "email";
  challenge?: OtpChallenge;
  resetToken?: string;
  /** Message à afficher sur WL02 (retour forcé au début du parcours). */
  notice?: string;
};

type ResetFlow = { flow: ResetFlowState; update: (patch: Partial<ResetFlowState>) => void };

const ResetFlowContext = createContext<ResetFlow | null>(null);

export function ResetFlowProvider({ children }: { children: ReactNode }) {
  const [flow, setFlow] = useState<ResetFlowState>({ channel: "sms" });
  const update = useCallback(
    (patch: Partial<ResetFlowState>) => setFlow((current) => ({ ...current, ...patch })),
    [],
  );
  const value = useMemo(() => ({ flow, update }), [flow, update]);
  return <ResetFlowContext value={value}>{children}</ResetFlowContext>;
}

export function useResetFlow(): ResetFlow {
  const flow = use(ResetFlowContext);
  if (!flow) throw new Error("useResetFlow() doit être utilisé sous ResetFlowProvider");
  return flow;
}

/** Message de WL02 quand une étape est ouverte sans l'état du parcours (rechargement, accès direct). */
export const RESTART_NOTICE =
  "Pour votre sécurité, la réinitialisation reprend depuis le début. Indiquez à nouveau votre numéro ou votre email.";
