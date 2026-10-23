"use client";

import type { ReactNode } from "react";

import { Button, InfoCard, type InfoCardRow } from "@/components/ds";

export type EditableCardProps = {
  title: string;
  rows: readonly InfoCardRow[];
  editing: boolean;
  onEdit: () => void;
  /** Libellé du bouton d'édition (« Modifier », « Changer »). */
  editLabel?: string;
  /** Formulaire affiché pendant l'édition, à la place des valeurs. */
  children: ReactNode;
};

/**
 * Carte de WPD08 : les valeurs lues dans l'API, puis le formulaire de modification à la place des valeurs quand
 * l'utilisateur clique sur « Modifier ».
 */
export function EditableCard({ title, rows, editing, onEdit, editLabel = "Modifier", children }: EditableCardProps) {
  if (editing) {
    return (
      <div className="rounded-lg border border-ink-100 bg-surface p-4.5">
        <h3 className="m-0 mb-3 text-sm font-black text-ink-900">{title}</h3>
        {children}
      </div>
    );
  }
  return (
    <div className="relative">
      <InfoCard title={title} rows={rows} />
      <Button variant="ghost" size="sm" onClick={onEdit} className="absolute top-3 right-3">
        {editLabel}
        <span className="sr-only"> : {title.toLowerCase()}</span>
      </Button>
    </div>
  );
}
