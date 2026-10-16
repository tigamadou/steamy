// Classes partagées du back-office : monochrome (`--ink-*`), la famille primaire y est bannie (SPEC-TECHNIQUE §2.4).

/** Focus visible au clavier, en encre. */
export const FOCUS = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink-900";

/** Carte blanche à filet (`.adm-card`). */
export const CARD = "rounded-2xl border border-ink-100 bg-surface p-4.5";

const NUMBER = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/** Nombre au format français (`1951472` → « 1 951 472 »). */
export function formatNumber(value: number): string {
  return NUMBER.format(value);
}

const BUTTON_BASE = `inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] px-3.5 py-2 text-[13px] font-extrabold no-underline transition-colors ${FOCUS}`;

/** Lien-bouton principal du back-office, en encre (`ADM_DARK_BTN`). */
export const BUTTON_DARK = `${BUTTON_BASE} border-[1.5px] border-ink-900 bg-ink-900 text-surface hover:bg-ink-800`;

/** Lien-bouton secondaire, à filet. */
export const BUTTON_OUTLINE = `${BUTTON_BASE} border-[1.5px] border-ink-200 bg-surface text-ink-900 hover:bg-ink-50`;
