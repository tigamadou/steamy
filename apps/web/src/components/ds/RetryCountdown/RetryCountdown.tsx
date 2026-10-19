"use client";

import { useEffect, useState } from "react";

import { Button } from "../Button";

export type RetryCountdownProps = {
  /** Délai renvoyé par l'API (`retryInSec`, `Retry-After`), jamais calculé côté front (D32). */
  seconds: number;
  /** Quiz à repasser une fois le délai écoulé. */
  href: string;
  label?: string;
  /** Message annoncé à l'expiration du délai. */
  readyMessage?: string;
};

/** Secondes → « 9:58 ». */
export function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

// Bouton « Réessayer » désactivé avec compte à rebours (WJ08, WD08), puis lien vers le quiz ; l'expiration est
// annoncée (`aria-live`). Le serveur reste juge : un essai trop tôt reçoit `QUIZ_COOLDOWN`.
export function RetryCountdown({
  seconds,
  href,
  label = "Réessayer le quiz",
  readyMessage = "Tu peux réessayer le quiz.",
}: RetryCountdownProps) {
  const [deadline] = useState(() => Date.now() + seconds * 1000);
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [deadline, seconds]);

  return (
    <div className="flex flex-col gap-2">
      {left > 0 ? (
        <Button variant="primary" icon="lock" disabled block>
          {label} dans <span className="tabular-nums">{formatCountdown(left)}</span>
        </Button>
      ) : (
        <Button href={href} variant="primary" icon="arrow-right" block>
          {label}
        </Button>
      )}
      <p aria-live="polite" className="sr-only">
        {left > 0 ? "" : readyMessage}
      </p>
    </div>
  );
}
