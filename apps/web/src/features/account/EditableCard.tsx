"use client";

import { useEffect, useRef, type ReactNode } from "react";

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
 * Carte de WPD08 et WT08 : les valeurs lues dans l'API, puis le formulaire de modification à la place des valeurs quand
 * l'utilisateur clique sur « Modifier ». Le bouton qui avait le focus disparaît à chaque bascule : le focus passe au
 * titre du formulaire à l'ouverture et revient au bouton « Modifier » à la fermeture.
 */
export function EditableCard({ title, rows, editing, onEdit, editLabel = "Modifier", children }: EditableCardProps) {
  const card = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const wasEditing = useRef(false);

  useEffect(() => {
    if (editing) heading.current?.focus();
    else if (wasEditing.current) card.current?.querySelector("button")?.focus();
    wasEditing.current = editing;
  }, [editing]);

  if (editing) {
    return (
      <div ref={card} className="rounded-lg border border-ink-100 bg-surface p-4.5">
        <h3 ref={heading} tabIndex={-1} className="m-0 mb-3 text-sm font-black text-ink-900 outline-none">
          {title}
        </h3>
        {children}
      </div>
    );
  }
  return (
    <div ref={card} className="relative">
      <InfoCard title={title} rows={rows} />
      <Button variant="ghost" size="sm" onClick={onEdit} className="absolute top-3 right-3">
        {editLabel}
        <span className="sr-only"> : {title.toLowerCase()}</span>
      </Button>
    </div>
  );
}
