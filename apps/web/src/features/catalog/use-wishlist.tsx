"use client";

import { useCallback, useRef, useState } from "react";

import { useUndoableAction, type ActionOutcome, type PerformOptions } from "@/lib/use-undoable-action";

import { addToWishlist, failureMessage, removeFromWishlist } from "./api";

/** Message du toast de retrait (WW03). */
export const REMOVED_MESSAGE = "Parcours retiré des souhaits";
/** Message du toast d'ajout. */
export const ADDED_MESSAGE = "Parcours ajouté à tes souhaits";

/**
 * Cœurs du catalogue, de la fiche et de WW01 : ajout optimiste ; retrait optimiste avec toast « Annuler » (WW03).
 * Un échec rétablit l'état et affiche le message de l'API. Les requêtes d'un même parcours partent l'une après
 * l'autre (double clic) : le serveur finit dans l'état affiché.
 */
export function useWishlist(initial: string[]) {
  const [wished, setWished] = useState(() => new Set(initial));
  // État courant, lu par deux clics rapprochés avant le rendu suivant
  const current = useRef(wished);
  const queues = useRef(new Map<string, Promise<unknown>>());
  const { perform, notify, toast } = useUndoableAction();

  const set = useCallback((slug: string, value: boolean) => {
    const next = new Set(current.current);
    if (value) next.add(slug);
    else next.delete(slug);
    current.current = next;
    setWished(next);
  }, []);

  /** Envoi mis en file derrière les précédents du même parcours. */
  const enqueue = useCallback((slug: string, send: () => Promise<ActionOutcome>): Promise<ActionOutcome> => {
    const previous = queues.current.get(slug) ?? Promise.resolve();
    const next = previous.then(send);
    queues.current.set(slug, next);
    return next;
  }, []);

  const add = useCallback(
    async (slug: string) => {
      set(slug, true);
      const error = await enqueue(slug, async () => failureMessage(await addToWishlist(slug)));
      if (error) {
        set(slug, false);
        notify(error, "error");
      } else {
        notify(ADDED_MESSAGE);
      }
    },
    [set, enqueue, notify],
  );

  const remove = useCallback(
    (slug: string, options?: PerformOptions) =>
      perform(
        {
          message: REMOVED_MESSAGE,
          apply: () => set(slug, false),
          revert: () => set(slug, true),
          commit: () => enqueue(slug, async () => failureMessage(await removeFromWishlist(slug))),
          undo: () => enqueue(slug, async () => failureMessage(await addToWishlist(slug))),
        },
        options,
      ),
    [perform, set, enqueue],
  );

  const toggle = useCallback(
    (slug: string, options?: PerformOptions) => (current.current.has(slug) ? remove(slug, options) : add(slug)),
    [add, remove],
  );

  return { wished, toggle, toast };
}
