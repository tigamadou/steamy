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

export type PerformOptions = {
  /**
   * L'élément qui avait le focus disparaît (carte retirée) : le focus passe sur « Annuler » (WCAG 2.4.3), ce qui
   * suspend aussi la disparition du toast.
   */
  focusUndo?: boolean;
  /** Appelé quand l'élément revient à l'écran (annulation, ou envoi en échec), pour y remettre le focus. */
  onRestore?: () => void;
};

type ToastState = { id: number; tone: ToastTone; title: string; onUndo?: () => void; focus?: boolean };

/** Durée d'affichage d'un toast d'information, hors survol et focus ; un toast d'erreur reste jusqu'à sa fermeture. */
export const UNDO_TOAST_MS = 8000;

/**
 * Modèle des suppressions réversibles de l'espace apprenant (WW03, SPEC-ECRANS-2 §5.8) : l'action est appliquée
 * tout de suite à l'écran et envoyée au serveur, un toast `aria-live` propose « Annuler ». Un échec de l'envoi
 * rétablit l'écran et l'annonce ; l'annulation attend la fin de l'envoi avant d'inverser l'action. Le toast ne
 * disparaît pas tant qu'il est survolé ou qu'il a le focus (WCAG 2.2.1).
 */
export function useUndoableAction({ undoLabel = "Annuler" }: { undoLabel?: string } = {}) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [held, setHeld] = useState(false);
  const nextId = useRef(0);
  const undoButton = useRef<HTMLButtonElement>(null);

  const show = useCallback((state: Omit<ToastState, "id">) => {
    nextId.current += 1;
    setHeld(false);
    setToast({ ...state, id: nextId.current });
  }, []);

  /**
   * Ferme le toast. S'il avait le focus, celui-ci passe au contenu principal (`#contenu`) au lieu de retomber sur
   * `body` (WCAG 2.4.3).
   */
  const dismiss = useCallback(() => {
    const hadFocus = document.activeElement?.closest("[data-toast]") != null;
    setToast(null);
    if (hadFocus) document.getElementById("contenu")?.focus();
  }, []);

  /** Toast sans annulation (confirmation ou erreur). */
  const notify = useCallback((title: string, tone: ToastTone = "success") => show({ title, tone }), [show]);

  const perform = useCallback(
    (action: UndoableAction, { focusUndo, onRestore }: PerformOptions = {}) => {
      action.apply();
      const sent = action.commit().then((error) => {
        if (error) {
          action.revert();
          onRestore?.();
          show({ title: error, tone: "error" });
        }
        return error;
      });
      show({
        title: action.message,
        tone: "success",
        focus: focusUndo,
        onUndo: async () => {
          setToast(null);
          // L'envoi a échoué : l'écran est déjà rétabli, rien à annuler
          if (await sent) return;
          action.revert();
          onRestore?.();
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

  // Focus sur « Annuler » quand l'élément d'origine a disparu
  const focusId = toast?.focus ? toast.id : null;
  useEffect(() => {
    if (focusId !== null) undoButton.current?.focus();
  }, [focusId]);

  // Un toast d'information disparaît seul, sauf survol ou focus ; l'erreur reste affichée jusqu'à sa fermeture.
  useEffect(() => {
    if (!toast || toast.tone === "error" || held) return;
    const timer = setTimeout(() => setToast((current) => (current?.id === toast.id ? null : current)), UNDO_TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast, held]);

  const element: ReactNode = toast && (
    <Toast
      key={toast.id}
      tone={toast.tone}
      title={toast.title}
      onClose={dismiss}
      onHoldChange={setHeld}
      action={
        toast.onUndo && (
          <button
            ref={undoButton}
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
