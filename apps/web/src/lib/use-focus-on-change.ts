"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Dernière clé affichée de chaque liste : gardée hors du composant, qui est remonté à chaque page ou filtre. */
const lastKeys = new Map<string, string>();

/**
 * Pagination : quand la liste `name` s'affiche avec une autre clé que la précédente (nouvelle page, nouveau filtre),
 * le focus passe à l'élément cible (liste avec `tabIndex={-1}`) au lieu de retomber sur `body` (WCAG 2.4.3). Rien à
 * la première visite. En StrictMode, le second passage de l'effet voit la même clé et ne refait rien.
 */
export function useFocusOnChange<T extends HTMLElement>(name: string, key: string): RefObject<T | null> {
  const target = useRef<T>(null);
  useEffect(() => {
    const previous = lastKeys.get(name);
    lastKeys.set(name, key);
    if (previous !== undefined && previous !== key) target.current?.focus();
  }, [name, key]);
  return target;
}
