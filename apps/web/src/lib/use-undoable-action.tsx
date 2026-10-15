"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { Toast, type ToastTone } from "@/components/ds/Toast";

/** Résultat d'un envoi au serveur : `null` s'il a réussi, sinon le message d'erreur à afficher. */
export type ActionOutcome = string | null;

export type UndoableAction = {
  /** Message du toast après l'action (ex. « Parcours retiré des souhaits »). */
  message: string;
  /** Effet local immédiat (mise à jour optimiste). */
  apply: () => void;
  /** Retour à l'état local d'avant l'action. */
  revert: () => void;
  /** Envoi de l'action au serveur. */
  commit: () => Promise<ActionOutcome>;
  /** Annulation côté serveur (ex. un nouveau `PUT` après un `DELETE`). */
  undo: () => Promise<ActionOutcome>;
};

type ToastState = { id: number; tone: ToastTone; title: string; onUndo?: () => void };

/** Durée d'affichage d'un toast d'information ; un toast d'erreur reste jusqu'à sa fermeture. */
export const UNDO_TOAST_MS = 8000;

/**
 * Modèle des suppressions réversibles de l'espace apprenant (WW03, SPEC-ECRANS-2 §5.8) : l'action est appliquée
 * tout de suite à l'écran et envoyée au serveur, un toast `aria-live` propose « Annuler ». Un échec de l'envoi
 * rétablit l'écran et l'annonce ; l'annulation attend la fin de l'envoi avant d'inverser l'action.
 */
export function useUndoableAction({ undoLabel = "Annuler" }: { undoLabel?: string } = {}) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);

  const show = useCallback((state: Omit<ToastState, "id">) => {
    nextId.current += 1;
    setToast({ ...state, id: nextId.current });
  }, []);

  /** Toast sans annulation (confirmation ou erreur). */
  const notify = useCallback((title: string, tone: ToastTone = "success") => show({ title, tone }), [show]);

  const perform = useCallback(
    (action: UndoableAction) => {
      action.apply();
      const sent = action.commit().then((error) => {
        if (error) {
          action.revert();
          show({ title: error, tone: "error" });
        }
        return error;
      });
      show({
        title: action.message,
        tone: "success",
        onUndo: async () => {
          setToast(null);
          // L'envoi a échoué : l'écran est déjà rétabli, rien à annuler
          if (await sent) return;
          action.revert();
          const error = await action.undo();
          if (error) {
            action.apply();
            show({ title: error, tone: "error" });
          }
        },
      });
    },
    [show],
  );

  // Un toast d'information disparaît seul ; l'erreur reste affichée jusqu'à sa fermeture.
  useEffect(() => {
    if (!toast || toast.tone === "error") return;
    const timer = setTimeout(() => setToast((current) => (current?.id === toast.id ? null : current)), UNDO_TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const element: ReactNode = toast && (
    <Toast
      key={toast.id}
      tone={toast.tone}
      title={toast.title}
      onClose={() => setToast(null)}
      action={
        toast.onUndo && (
          <button
            type="button"
            onClick={toast.onUndo}
            className="cursor-pointer rounded-sm px-2.5 py-1.5 text-[13px] font-extrabold text-amber-400 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
          >
            {undoLabel}
          </button>
        )
      }
    />
  );

  return { perform, notify, toast: element };
}
