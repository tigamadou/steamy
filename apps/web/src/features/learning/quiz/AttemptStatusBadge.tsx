import type { Schemas } from "@steamy/api-client";

import { Badge, type BadgeTone } from "@/components/ds/Badge";

const STATUS: Record<Schemas["AttemptStatusEnum"], { tone: BadgeTone; label: string }> = {
  ok: { tone: "success", label: "Réussi" },
  warn: { tone: "amber", label: "À refaire" },
  ko: { tone: "error", label: "Échoué" },
};

/** Statut d'une tentative, calculé par le serveur (D31) et affiché tel quel. */
export function AttemptStatusBadge({ status }: { status: Schemas["AttemptStatusEnum"] }) {
  const { tone, label } = STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}
