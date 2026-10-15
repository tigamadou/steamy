import { CARD } from "./styles";

export type PendingPanelProps = { kicker: string; title: string; text: string };

/** Page du back-office dont les données arrivent avec une étape d'API ultérieure : rien de fictif n'est affiché. */
export function PendingPanel({ kicker, title, text }: PendingPanelProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-[18px] bg-ink-900 px-6.5 py-5.5 text-surface">
        <p className="m-0 text-[11px] font-extrabold tracking-[.08em] text-surface/70 uppercase">{kicker}</p>
        <h2 className="m-0 mt-1.5 text-2xl font-black tracking-[-.01em]">{title}</h2>
      </div>
      <p className={`${CARD} m-0 text-sm font-semibold leading-relaxed text-ink-600`}>{text}</p>
    </section>
  );
}
