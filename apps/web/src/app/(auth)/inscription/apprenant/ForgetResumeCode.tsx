"use client";

import { useEffect } from "react";

import { RESUME_CODE_KEY } from "./SignupDraft";

/** Issue de la demande connue (W08, W18) : le code de reprise n'a plus d'usage, sa copie d'onglet est effacée. */
export function ForgetResumeCode() {
  useEffect(() => {
    try {
      sessionStorage.removeItem(RESUME_CODE_KEY);
    } catch {
      // Stockage indisponible : rien à effacer
    }
  }, []);
  return null;
}
