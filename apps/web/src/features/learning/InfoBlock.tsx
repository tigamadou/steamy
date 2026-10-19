import { Icon } from "@/components/ds/Icon";

/** Bloc de liste du projet (WJ01) : objectifs, prérequis, matériel. Absent si l'API ne renvoie rien. */
export function InfoBlock({ emoji, title, items }: { emoji: string; title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-[18px] border-2 border-ink-100 bg-surface p-4.5">
      <h3 className="m-0 mb-2.5 flex items-center gap-2 text-[15px] font-black text-ink-900">
        <span aria-hidden>{emoji}</span>
        {title}
      </h3>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm leading-snug font-semibold text-ink-700">
            <Icon name="check" size={14} strokeWidth={3} className="mt-0.5 text-success-700" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
