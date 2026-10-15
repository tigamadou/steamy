"use client";

import { useEffect, useState } from "react";

import { cx } from "@/lib/cx";

import { Button } from "../Button";

export type ResendCountdownProps = {
  /** Délai avant de pouvoir renvoyer, en secondes (D24 : 60 s). */
  seconds?: number;
  /** Renvoi du code ; peut résoudre le `retryAfter` de l'API (secondes) pour le prochain délai. */
  onResend: () => Promise<number | void>;
  /** Change de valeur pour redémarrer le compte à rebours depuis la page. */
  restartKey?: string | number;
  /** Libellé stable du bouton. */
  label?: string;
  /** Texte visible devant le compte à rebours. */
  countdownLabel?: string;
  /** Annonce unique à la fin du délai (« Vous pouvez renvoyer le code. » au vouvoiement). */
  readyMessage?: string;
  className?: string;
};

const formatDelay = (total: number) => `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;

/**
 * Bouton « Renvoyer le code » bloqué pendant un délai. Le décompte visible est masqué aux lecteurs
 * d'écran (pas d'annonce à chaque seconde) ; seule la fin du délai est annoncée, une fois.
 */
export function ResendCountdown({
  seconds = 60,
  onResend,
  restartKey,
  label = "Renvoyer le code",
  countdownLabel = "Renvoyer le code dans",
  readyMessage = "Tu peux renvoyer le code.",
  className,
}: ResendCountdownProps) {
  const [remaining, setRemaining] = useState(seconds);
  const [loading, setLoading] = useState(false);
  const [key, setKey] = useState(restartKey);

  // Redémarrage demandé par la page : ajusté au rendu plutôt que dans un effet
  if (key !== restartKey) {
    setKey(restartKey);
    setRemaining(seconds);
  }

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const resend = async () => {
    setLoading(true);
    try {
      const retryAfter = await onResend();
      setRemaining(retryAfter ?? seconds);
    } catch {
      // Échec : le bouton redevient actif, la page affiche l'erreur
    } finally {
      setLoading(false);
    }
  };

  const waiting = remaining > 0;

  return (
    <div className={cx("flex flex-col items-center gap-1", className)}>
      {waiting && (
        <p aria-hidden className="text-sm font-bold text-ink-600">
          {countdownLabel} <strong className="text-primary-600 tabular-nums">{formatDelay(remaining)}</strong>
        </p>
      )}
      <Button variant="ghost" disabled={waiting} loading={loading} onClick={resend}>
        {label}
      </Button>
      <p aria-live="polite" className="sr-only">
        {!waiting && !loading ? readyMessage : ""}
      </p>
    </div>
  );
}
