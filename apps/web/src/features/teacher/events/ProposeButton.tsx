"use client";

import type { Schemas } from "@steamy/api-client";
import { useRef, useState } from "react";

import { Button, Field, Modal, Select } from "@/components/ds";
import { apiCall, errorMessage } from "@/lib/api-call";

type Classroom = Pick<Schemas["Classroom"], "id" | "name">;

/**
 * « Proposer à une classe » (WT09) : choix de la classe dans une fenêtre, puis confirmation « Les élèves et leurs
 * parents ont été notifiés ». Proposer = notifier seulement : chaque élève candidate seul, avec l'accord de son
 * parent (S8, C3). Une seconde proposition à la même classe est refusée par le serveur (son message est affiché).
 */
export function ProposeButton({
  eventSlug,
  eventTitle,
  classrooms,
  size = "sm",
  closedReason,
}: {
  eventSlug: string;
  eventTitle: string;
  classrooms: Classroom[];
  size?: "sm" | "md" | "lg";
  /** Motif quand les candidatures sont closes (complet, délai passé, passé) : la proposition n'a plus d'objet. */
  closedReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [classroomId, setClassroomId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [notified, setNotified] = useState<number | null>(null);
  const inFlight = useRef(false);

  function close() {
    setOpen(false);
    setError(undefined);
    setNotified(null);
  }

  async function send() {
    if (inFlight.current) return;
    if (!classroomId) {
      setError("Choisissez une classe.");
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError(undefined);
    const result = await apiCall((api) =>
      api.POST("/api/events/{slug}/proposals/", {
        params: { path: { slug: eventSlug } },
        body: { classroomId: Number(classroomId) },
      }),
    );
    inFlight.current = false;
    setPending(false);
    if (!result.ok) {
      setError(errorMessage(result, "vous"));
      return;
    }
    setNotified(result.data.notifiedCount);
  }

  if (closedReason || classrooms.length === 0) {
    return (
      <Button size={size} disabled aria-describedby={`indisponible-${eventSlug}`}>
        Proposer à une classe<span className="sr-only"> : {eventTitle}</span>
        <span id={`indisponible-${eventSlug}`} className="sr-only">
          {closedReason ?? "Créez d'abord une classe."}
        </span>
      </Button>
    );
  }

  return (
    <>
      <Button size={size} variant="outline" onClick={() => setOpen(true)}>
        Proposer à une classe<span className="sr-only"> : {eventTitle}</span>
      </Button>
      <Modal
        open={open}
        onClose={close}
        icon="🎟️"
        title={notified === null ? `Proposer « ${eventTitle} » à une classe` : "Proposition envoyée"}
        actions={
          notified === null ? (
            <>
              <Button variant="ghost" onClick={close}>
                Annuler
              </Button>
              <Button loading={pending} onClick={() => void send()}>
                Envoyer la proposition
              </Button>
            </>
          ) : (
            <Button onClick={close}>Terminer</Button>
          )
        }
      >
        {notified === null ? (
          <div className="flex flex-col gap-3">
            <p className="m-0">
              Les élèves de la classe et leurs parents sont notifiés. Chaque élève candidate ensuite seul, avec l&apos;accord
              de son parent.
            </p>
            <Field label="Classe" id={`proposition-classe-${eventSlug}`} required error={error}>
              <Select value={classroomId} onChange={(event) => setClassroomId(event.target.value)}>
                <option value="">Choisissez une classe</option>
                {classrooms.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : (
          <p role="status" className="m-0">
            Les élèves et leurs parents ont été notifiés ({notified} notification{notified > 1 ? "s" : ""}).
          </p>
        )}
      </Modal>
    </>
  );
}
