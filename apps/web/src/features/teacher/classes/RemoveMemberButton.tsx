"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ds";
import { apiCall } from "@/lib/api-call";

import { ConfirmDialog } from "./ConfirmDialog";

/** Identifiant du titre de la liste des élèves de WT04, où le focus passe quand une ligne disparaît. */
export const MEMBERS_HEADING_ID = "eleves-classe";

/**
 * « Retirer de la classe » (élève actif) ou « Annuler l'invitation » (invitation en attente) : confirmation, puis
 * `POST classrooms/{id}/members/{memberId}/remove/`. La place est libérée côté serveur ; la page est relue et, quand la ligne
 * (et son bouton) disparaît, le focus passe au titre de la liste.
 */
export function RemoveMemberButton({
  classroomId,
  memberId,
  name,
  invitation,
  closed = false,
}: {
  classroomId: number;
  memberId: number;
  name: string;
  invitation: boolean;
  /** Invitation refusée ou expirée : elle ne retient plus de place dans le quota. */
  closed?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const removed = useRef(false);
  // La ligne disparaît quand la page relue ne la contient plus : le focus passe alors au titre de la liste
  useEffect(
    () => () => {
      if (removed.current) document.getElementById(MEMBERS_HEADING_ID)?.focus();
    },
    [],
  );
  const label = closed ? "Retirer l'invitation" : invitation ? "Annuler l'invitation" : "Retirer de la classe";
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {label}
        <span className="sr-only"> : {name}</span>
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={closed ? "Retirer cette invitation ?" : invitation ? "Annuler cette invitation ?" : "Retirer cet élève de la classe ?"}
        confirmLabel={label}
        onConfirm={() =>
          apiCall((api) =>
            api.POST("/api/classrooms/{id}/members/{member_id}/remove/", {
              params: { path: { id: String(classroomId), member_id: String(memberId) } },
            }),
          )
        }
        onDone={() => {
          removed.current = true;
          router.refresh();
        }}
      >
        <p className="m-0">
          {closed
            ? `L'invitation de ${name} est retirée de la liste.`
            : invitation
              ? `L'invitation de ${name} est annulée et sa place est libérée dans le quota de l'établissement.`
              : `${name} ne fait plus partie de la classe et sa place est libérée dans le quota de l'établissement.`}
        </p>
      </ConfirmDialog>
    </>
  );
}
