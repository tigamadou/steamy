import type { ReactNode } from "react";

export type SectionHeadProps = {
  /** Identifiant du titre, pour nommer la section (`aria-labelledby`). */
  id?: string;
  title: string;
  sub?: ReactNode;
  /** Action ou statut à droite. */
  right?: ReactNode;
};

/** En-tête d'une carte du back-office (`AdmHead` de la maquette) : titre, sous-titre, élément à droite. */
export function SectionHead({ id, title, sub, right }: SectionHeadProps) {
  return (
    <div className="mb-3.5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="m-0 text-[15px] font-extrabold text-ink-900">
          {title}
        </h2>
        {sub && <p className="m-0 mt-0.75 text-xs font-semibold text-ink-500">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
