"use client";

import { useState } from "react";

import { cx } from "@/lib/cx";

import { Button } from "../Button";

export type ResumeCodeCardProps = {
  /** Code de reprise (C5), tel que renvoyé une seule fois par l'API. */
  code: string;
  /** Date d'expiration déjà mise en forme (« 22 octobre 2026 », D21 : 7 jours). */
  expiresOn: string;
  className?: string;
};

/** Code groupé par 4 pour la lecture et la recopie : `ABCD EFGH`. */
export function groupCode(code: string): string {
  return code.replace(/[\s-]/g, "").replace(/(.{4})(?=.)/g, "$1 ");
}

/**
 * Code de reprise d'inscription (W07) : affiché en grand, groupé, avec un bouton « Copier » et sa date
 * d'expiration. Le code n'est pas régénérable (C14) : l'écran invite à le noter.
 */
export function ResumeCodeCard({ code, expiresOn, className }: ResumeCodeCardProps) {
  const [copied, setCopied] = useState<boolean>();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section
      aria-labelledby="code-reprise-titre"
      className={cx("flex flex-col items-center gap-3 rounded-2xl border-2 border-primary-200 bg-primary-50 p-5", className)}
    >
      <h2 id="code-reprise-titre" className="text-sm font-extrabold text-primary-700">
        Ton code de reprise
      </h2>
      <p className="text-3xl tabular-nums font-black tracking-[0.12em] text-ink-900" aria-label={code.split("").join(" ")}>
        {groupCode(code)}
      </p>
      <p className="text-center text-sm font-semibold text-ink-700">
        Note-le : il te permet de reprendre ton inscription jusqu&apos;au {expiresOn}. On ne pourra pas te le
        redonner.
      </p>
      <Button variant="outline" size="sm" icon="copy" onClick={copy}>
        Copier le code
      </Button>
      <p aria-live="polite" className="text-xs font-bold text-ink-600">
        {copied === true && "Code copié."}
        {copied === false && "Copie impossible : recopie-le à la main."}
      </p>
    </section>
  );
}
