"use client";

import { useEffect } from "react";

/** Rend le focus à un élément de la page après une redirection (WCAG 2.4.3), ici la ligne ou le titre d'un enfant. */
export function FocusOnMount({ targetId }: { targetId: string }) {
  useEffect(() => {
    document.getElementById(targetId)?.focus();
  }, [targetId]);
  return null;
}
