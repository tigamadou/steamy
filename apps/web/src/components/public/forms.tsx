import type { ReactNode } from "react";

import { Mascot } from "@/components/ds";

import { HONEYPOT_FIELD } from "@/lib/public-forms";

// Pièces communes des formulaires publics (WL11, WL20, WL24).

/** Champ piège anti-robot, invisible et hors du parcours clavier ; l'API ignore l'envoi s'il est rempli. */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Ne pas remplir
        <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

/** Confirmation en place après un envoi réussi (le focus y est placé pour l'annoncer). */
export function SentConfirmation({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action: ReactNode;
}) {
  return (
    <div
      role="status"
      tabIndex={-1}
      ref={(node) => node?.focus()}
      className="flex flex-col items-center gap-3.5 py-5 text-center outline-none"
    >
      <Mascot pose="cheer" size={130} hue="var(--success-500)" />
      <h2 className="text-[26px] font-black text-success-700">{title}</h2>
      <div className="max-w-[440px] text-[15px] leading-normal font-semibold text-ink-700">{children}</div>
      {action}
    </div>
  );
}
