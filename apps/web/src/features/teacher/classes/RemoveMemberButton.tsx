"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ds";
import { apiCall } from "@/lib/api-call";

import { ConfirmDialog } from "./ConfirmDialog";

/** Identifiant du titre de la liste des élèves de WT04, où le focus passe quand une ligne disparaît. */
export const MEMBERS_HEADING_ID = "eleves-classe";

/**
 * « Retirer de la classe » (élève actif) ou « Annuler l'invitation » (invitation en attente) : confirmation, puis
 * `POST classrooms/{id}/members/{memberId}/remove/`. La place est libérée côté serveur ; la page est relue et le focus
 * passe au titre de la liste, la ligne (et son bouton) ayant disparu.
 */
export function RemoveMemberButton({
  classroomId,
  memberId,
  name,
  invitation,
}: {
  classroomId: number;
  memberId: number;
  name: string;
  invitation: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const label = invitation ? "Annuler l'invitation" : "Retirer de la classe";
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {label}
        <span className="sr-only"> : {name}</span>
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={invitation ? "Annuler cette invitation ?" : "Retirer cet élève de la classe ?"}
        confirmLabel={label}
        onConfirm={() =>
          apiCall((api) =>
            api.POST("/api/classrooms/{id}/members/{member_id}/remove/", {
              params: { path: { id: String(classroomId), member_id: String(memberId) } },
            }),
          )
        }
        onDone={() => {
          router.refresh();
          // Après la fermeture de la fenêtre, qui rend d'abord le focus au bouton d'origine
          setTimeout(() => document.getElementById(MEMBERS_HEADING_ID)?.focus(), 0);
        }}
      >
        <p className="m-0">
          {invitation
            ? `L'invitation de ${name} est annulée et sa place est libérée dans le quota de l'établissement.`
            : `${name} ne fait plus partie de la classe et sa place est libérée dans le quota de l'établissement.`}
        </p>
      </ConfirmDialog>
    </>
  );
}
