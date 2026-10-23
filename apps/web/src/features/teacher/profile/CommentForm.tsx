"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { Button, Field, Select, Textarea } from "@/components/ds";
import { apiCall, errorMessage } from "@/lib/api-call";

import type { TeacherAttempt } from "./api";

/** Longueur maximale d'un commentaire, comme l'API : des retours courts, pas une messagerie (D63, S11). */
export const COMMENT_MAX = 1000;

/**
 * Commentaire de WT05 : `textarea` et « Envoyer le commentaire », rattachable à une tentative (`?tentative=` la
 * présélectionne). Visible de l'élève et de son parent, qui en sont notifiés (D63) : à sens unique, sans réponse. Un
 * seul envoi à la fois ; en cas d'échec, le texte est conservé et l'erreur reste affichée pour un nouvel essai.
 */
export function CommentForm({
  learnerId,
  classroomId,
  attempts,
  defaultAttemptId,
}: {
  learnerId: number;
  classroomId: number;
  attempts: Pick<TeacherAttempt, "id" | "quiz">[];
  defaultAttemptId?: number;
}) {
  const router = useRouter();
  const inFlight = useRef(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("");
  const [attemptId, setAttemptId] = useState(defaultAttemptId === undefined ? "" : String(defaultAttemptId));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const text = body.trim();
    if (!text) {
      setError("Écrivez votre commentaire.");
      field.current?.focus();
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError(undefined);
    const result = await apiCall((api) =>
      api.POST("/api/classrooms/learners/{id}/comments/", {
        params: { path: { id: learnerId } },
        body: { body: text, attemptId: attemptId ? Number(attemptId) : null, classroomId },
      }),
    );
    inFlight.current = false;
    setPending(false);
    if (!result.ok) {
      setError(result.fields.body || errorMessage(result, "vous"));
      field.current?.focus();
      return;
    }
    setBody("");
    setAttemptId("");
    setSent((n) => n + 1);
    // L'historique, « À revoir » et le statut de la tentative sont relus
    router.refresh();
    field.current?.focus();
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-label="Commenter" className="flex flex-col gap-3">
      <Field label="Commentaire" id="commentaire" required error={error}>
        <Textarea
          ref={field}
          name="body"
          rows={5}
          maxLength={COMMENT_MAX}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </Field>
      <p className="m-0 flex justify-between gap-3 text-xs font-bold text-ink-600">
        <span>Visible par l&apos;élève et son parent, qui en sont notifiés.</span>
        <span aria-live="off">
          {body.length} / {COMMENT_MAX}
        </span>
      </p>
      {attempts.length > 0 && (
        <Field label="À propos de la tentative" id="commentaire-tentative" hint="Facultatif.">
          <Select name="attemptId" value={attemptId} onChange={(event) => setAttemptId(event.target.value)}>
            <option value="">Aucune tentative en particulier</option>
            {attempts.map((attempt) => (
              <option key={attempt.id} value={attempt.id}>
                {attempt.quiz.title}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="m-0 text-sm font-bold text-success-700">
          {sent > 0 && !error && "Commentaire envoyé."}
        </p>
        <Button type="submit" loading={pending} icon="arrow-right">
          Envoyer le commentaire
        </Button>
      </div>
    </form>
  );
}
