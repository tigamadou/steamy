"use client";

import { useCallback, useState } from "react";

import { useUndoableAction } from "@/lib/use-undoable-action";

import { addToWishlist, failureMessage, removeFromWishlist } from "./api";

/** Message du toast de retrait (WW03). */
export const REMOVED_MESSAGE = "Parcours retiré des souhaits";
/** Message du toast d'ajout. */
export const ADDED_MESSAGE = "Parcours ajouté à tes souhaits";

/**
 * Cœurs du catalogue, de la fiche et de WW01 : ajout optimiste ; retrait optimiste avec toast « Annuler » (WW03).
 * Un échec rétablit l'état et affiche le message de l'API.
 */
export function useWishlist(initial: string[]) {
  const [wished, setWished] = useState(() => new Set(initial));
  const { perform, notify, toast } = useUndoableAction();

  const set = useCallback((slug: string, value: boolean) => {
    setWished((current) => {
      const next = new Set(current);
      if (value) next.add(slug);
      else next.delete(slug);
      return next;
    });
  }, []);

  const add = useCallback(
    async (slug: string) => {
      set(slug, true);
      const error = failureMessage(await addToWishlist(slug));
      if (error) {
        set(slug, false);
        notify(error, "error");
      } else {
        notify(ADDED_MESSAGE);
      }
    },
    [set, notify],
  );

  const remove = useCallback(
    (slug: string) =>
      perform({
        message: REMOVED_MESSAGE,
        apply: () => set(slug, false),
        revert: () => set(slug, true),
        commit: async () => failureMessage(await removeFromWishlist(slug)),
        undo: async () => failureMessage(await addToWishlist(slug)),
      }),
    [perform, set],
  );

  const toggle = useCallback(
    (slug: string) => (wished.has(slug) ? remove(slug) : add(slug)),
    [wished, add, remove],
  );

  return { wished, toggle, toast };
}
