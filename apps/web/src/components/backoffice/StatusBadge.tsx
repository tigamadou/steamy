import type { ReactNode } from "react";

import { Badge } from "@/components/ds/Badge";

/** Tons de statut admis au back-office : la couleur ne sert qu'aux statuts (jamais le primaire). */
export type StatusTone = "neutral" | "success" | "amber" | "error" | "info";

export type StatusBadgeProps = { tone: StatusTone; children: ReactNode };

/** Pastille de statut générique (brouillon, soumis…), ton fourni par l'appelant ou le serveur. */
export function StatusBadge({ tone, children }: StatusBadgeProps) {
  return (
    <Badge tone={tone}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </Badge>
  );
}
