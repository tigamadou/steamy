"use client";

import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";

/**
 * Brouillon de W04 → W05, en mémoire du layout du flux : rien dans l'URL ni dans le stockage du navigateur. Un
 * rechargement le vide et ramène à W04, champs vides. Le compte n'existe qu'après « Continuer » de W05.
 */
export type SignupDraftState = {
  firstName: string;
  lastName: string;
  username: string;
  privacyAccepted: boolean;
  age?: number;
  /** `USERNAME_TAKEN` reçu à la création (W05) : W04 s'ouvre dans l'état W19. */
  usernameTaken?: boolean;
};

const EMPTY: SignupDraftState = { firstName: "", lastName: "", username: "", privacyAccepted: false };

type SignupDraft = {
  draft: SignupDraftState;
  update: (patch: Partial<SignupDraftState>) => void;
};

const SignupDraftContext = createContext<SignupDraft | null>(null);

export function SignupDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<SignupDraftState>(EMPTY);
  const update = useCallback(
    (patch: Partial<SignupDraftState>) => setDraft((current) => ({ ...current, ...patch })),
    [],
  );
  const value = useMemo(() => ({ draft, update }), [draft, update]);
  return <SignupDraftContext value={value}>{children}</SignupDraftContext>;
}

export function useSignupDraft(): SignupDraft {
  const draft = use(SignupDraftContext);
  if (!draft) throw new Error("useSignupDraft() doit être utilisé sous SignupDraftProvider");
  return draft;
}

/** Code de reprise (C5) gardé dans l'onglet jusqu'à W08 ou W18 : affiché une seule fois par l'API (C14). */
export const RESUME_CODE_KEY = "steamy:resumeCode";
