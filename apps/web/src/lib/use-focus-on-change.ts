"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Pagination : quand `key` change (nouvelle page, nouveau filtre), le focus passe à l'élément cible (liste avec
 * `tabIndex={-1}`) au lieu de rester sur un lien disparu ou de retomber sur `body` (WCAG 2.4.3). Rien au premier
 * affichage.
 */
export function useFocusOnChange<T extends HTMLElement>(key: string | number): RefObject<T | null> {
  const target = useRef<T>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    target.current?.focus();
  }, [key]);
  return target;
}
