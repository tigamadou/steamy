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
