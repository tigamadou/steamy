import { SectionHeader } from "@/components/ds";

import { PendingActionRow, type PendingAction } from "./PendingActionRow";

/** « À valider » de WPD01 : toutes les demandes en attente du parent, la plus récente d'abord (ordre de l'API). */
export function PendingActionList({ actions }: { actions: PendingAction[] }) {
  return (
    <section aria-labelledby="a-valider">
      <SectionHeader id="a-valider" title="À valider" />
      {actions.length === 0 ? (
        <p className="m-0 rounded-[18px] border-[1.5px] border-dashed border-ink-200 bg-surface px-4.5 py-4 text-sm font-semibold text-ink-600">
          Aucune demande en attente. Nous vous prévenons dès que l&apos;un de vos enfants a besoin de votre accord.
        </p>
      ) : (
        <ul aria-label="Demandes à valider" className="m-0 flex list-none flex-col gap-3 p-0">
          {actions.map((action) => (
            <li key={`${action.type}-${action.id}`}>
              <PendingActionRow action={action} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
