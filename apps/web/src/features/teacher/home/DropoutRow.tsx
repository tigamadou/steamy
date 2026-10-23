import type { Schemas } from "@steamy/api-client";

import { Avatar, Badge, Button } from "@/components/ds";
import { formatRelative } from "@/lib/dates";
import { routes } from "@/lib/routes";

type Dropout = Schemas["Dropout"];

/** Ligne « Décrochage » (WT01, WT04) : élève inactif au-delà du seuil du serveur (D66) → WT05. */
export function DropoutRow({ dropout }: { dropout: Dropout }) {
  const { learner, classroom } = dropout;
  const name = `${learner.firstName} ${learner.lastName}`.trim();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] border border-ink-100 bg-surface px-4.5 py-3.5">
      <Avatar name={name} emoji={learner.avatar?.emoji} size={44} decorative />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-extrabold text-ink-900">{name}</p>
        <p className="m-0 mt-0.5 text-xs font-semibold text-ink-600">
          {classroom.name} · dernière activité {formatRelative(dropout.lastActivityAt)}
        </p>
      </div>
      <Badge tone="amber">Décrochage</Badge>
      <Button
        href={routes.teacher.learner(learner.id, { classroomId: classroom.id })}
        variant="outline"
        size="sm"
        aria-label={`Voir le profil de ${name}`}
      >
        Voir le profil
      </Button>
    </div>
  );
}
