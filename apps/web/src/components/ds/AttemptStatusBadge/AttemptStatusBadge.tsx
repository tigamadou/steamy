import { Badge, type BadgeTone } from "../Badge";

export type AttemptStatus = "ok" | "warn" | "ko";

const STATUS: Record<AttemptStatus, { tone: BadgeTone; label: string }> = {
  ok: { tone: "success", label: "Réussi" },
  warn: { tone: "amber", label: "À refaire" },
  ko: { tone: "error", label: "Échoué" },
};

/** Libellé d'un statut de tentative. */
export function attemptStatusLabel(status: AttemptStatus): string {
  return STATUS[status].label;
}

/** Statut d'une tentative, calculé par le serveur (D31) et affiché tel quel. */
export function AttemptStatusBadge({ status }: { status: AttemptStatus }) {
  const { tone, label } = STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}
