"use client";

import type { Schemas } from "@steamy/api-client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Field } from "@/components/ds/Field";
import { Textarea } from "@/components/ds/Textarea";
import { apiCall, errorMessage } from "@/lib/api-call";
import { formatInstant } from "@/lib/dates";
import { submitWith } from "@/lib/form";
import { routes } from "@/lib/routes";

import { SavedToast } from "./SavedToast";

type Deletion = Schemas["DeletionRequest"];

type SendState = { attempt: number; note?: string; error?: string };

/**
 * Règle D40, à la place du « irréversible » de la maquette : accord du parent, désactivation, anonymisation à J+30.
 * Après l'annulation d'une demande, le focus revient au titre du formulaire (WCAG 2.4.3).
 */
function DeletionRule({ focusKey }: { focusKey: number }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusKey > 0) heading.current?.focus();
  }, [focusKey]);
  return (
    <div className="flex items-start gap-3.5">
      <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-[16px] bg-error-100 text-[28px]">
        ⚠️
      </span>
      <div className="flex flex-col gap-2 text-sm leading-normal font-semibold text-ink-700">
        <h2 ref={heading} tabIndex={-1} className="m-0 text-xl font-black text-ink-900 outline-none">
          Supprimer ton compte ?
        </h2>
        <p className="m-0">
          Ta demande est <strong>envoyée à ton parent</strong> pour accord avant la suppression. S&apos;il
          l&apos;accepte, ton compte est désactivé tout de suite, puis anonymisé 30 jours plus tard (J+30) : ta
          progression, tes badges et tes données personnelles sont alors effacés.
        </p>
        <p className="m-0">Les factures de tes commandes sont conservées.</p>
      </div>
    </div>
  );
}

/** État « Demande envoyée à ton parent » : la demande peut être retirée tant qu'il ne l'a pas validée. */
function PendingRequest({
  request,
  onCancelled,
  focus,
}: {
  request: Deletion;
  onCancelled: () => void;
  /** Juste envoyée : le focus passe au titre de l'état (WCAG 2.4.3). */
  focus: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focus) heading.current?.focus();
  }, [focus]);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const cancel = () =>
    startTransition(async () => {
      const result = await apiCall((api) => api.DELETE("/api/accounts/me/deletion-request/"));
      if (result.ok) {
        onCancelled();
        return;
      }
      setError(
        result.code === "NOT_FOUND"
          ? "Ton parent a déjà répondu à ta demande : recharge la page pour voir sa réponse."
          : errorMessage(result, "tu"),
      );
    });
  return (
    <section aria-labelledby="demande-envoyee" className="flex flex-col gap-3">
      <h2 ref={heading} tabIndex={-1} id="demande-envoyee" className="m-0 text-xl font-black text-ink-900 outline-none">
        Demande envoyée à ton parent
      </h2>
      <p className="m-0 text-sm leading-normal font-semibold text-ink-700">
        Tu l&apos;as envoyée le {formatInstant(request.createdAt)}. Ton parent doit la valider avant la suppression ;
        d&apos;ici là, tu peux l&apos;annuler.
      </p>
      {error && (
        <p role="alert" className="m-0 text-sm font-bold text-error-700">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" block href={routes.learner.profile}>
          Retour au profil
        </Button>
        <Button variant="danger" block loading={pending} onClick={cancel}>
          Annuler ma demande
        </Button>
      </div>
    </section>
  );
}

/** Demande validée par le parent (`scheduled`, D54) : compte désactivé, anonymisé à la date servie par l'API. */
function ScheduledRequest({ request }: { request: Deletion }) {
  return (
    <section aria-labelledby="suppression-programmee" className="flex flex-col gap-3">
      <h2 id="suppression-programmee" className="m-0 text-xl font-black text-ink-900">
        Suppression validée par ton parent
      </h2>
      <p className="m-0 text-sm leading-normal font-semibold text-ink-700">
        {request.scheduledFor
          ? `Ton compte est désactivé et sera anonymisé le ${formatInstant(request.scheduledFor)}.`
          : "Ton compte est désactivé et sera bientôt anonymisé."}{" "}
        Seul ton parent peut encore annuler cette suppression.
      </p>
      <Button variant="outline" block href={routes.learner.profile}>
        Retour au profil
      </Button>
    </section>
  );
}

/**
 * WD15 · Supprimer son compte (D40) : règle expliquée, « Pourquoi pars-tu ? » facultatif, envoi au parent
 * (`POST accounts/me/deletion-request/`) → « Demande envoyée à ton parent », annulable tant qu'elle est
 * `pending_parent` (`DELETE`). Une demande refusée par le parent est signalée et une nouvelle peut être envoyée ; une
 * demande validée (`scheduled`) a son propre état, sans formulaire.
 */
export function AccountDeletion({ initial }: { initial: Deletion | null }) {
  const [request, setRequest] = useState(initial);
  const [cancelled, setCancelled] = useState(0);

  const [state, action, pending] = useActionState(
    async (previous: SendState, form: FormData): Promise<SendState> => {
      const attempt = previous.attempt + 1;
      const note = String(form.get("note") ?? "").trim();
      const result = await apiCall((api) => api.POST("/api/accounts/me/deletion-request/", { body: { note } }));
      if (result.ok) {
        setRequest(result.data);
        return { attempt };
      }
      if (result.fields.note) return { attempt, note: result.fields.note };
      return { attempt, error: errorMessage(result, "tu") };
    },
    { attempt: 0 },
  );

  if (request?.status === "pending_parent") {
    return (
      <div className="flex flex-col gap-4 rounded-[22px] border-2 border-ink-100 bg-surface p-5 sm:p-7">
        <PendingRequest
          request={request}
          focus={state.attempt > 0}
          onCancelled={() => {
            setRequest(null);
            setCancelled((n) => n + 1);
          }}
        />
      </div>
    );
  }

  if (request?.status === "scheduled") {
    return (
      <div className="flex flex-col gap-4 rounded-[22px] border-2 border-ink-100 bg-surface p-5 sm:p-7">
        <ScheduledRequest request={request} />
      </div>
    );
  }

  const errors = [
    state.note && { field: "pourquoi", message: state.note },
    state.error && { message: state.error },
  ].filter((item) => !!item);

  return (
    <>
      <form
        onSubmit={submitWith(action)}
        noValidate
        aria-label="Demande de suppression"
        className="flex flex-col gap-4.5 rounded-[22px] border-2 border-error-300 bg-surface p-5 sm:p-7"
      >
        <DeletionRule focusKey={cancelled} />
        {request?.status === "refused" && (
          <p className="m-0 rounded-[14px] bg-ink-50 p-3.5 text-[13px] font-bold text-ink-700">
            Ton parent a refusé ta demande précédente. Tu peux en envoyer une nouvelle si tu le souhaites.
          </p>
        )}
        <ErrorSummary errors={errors} focusKey={state.attempt} />
        <Field label="Pourquoi pars-tu ? (facultatif)" id="pourquoi" error={state.note}>
          <Textarea name="note" rows={3} maxLength={1000} placeholder="Ton retour nous aide à améliorer Steamy." />
        </Field>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" block href={routes.learner.profile}>
            Annuler
          </Button>
          <Button type="submit" variant="danger" block loading={pending}>
            Envoyer la demande
          </Button>
        </div>
      </form>
      {cancelled > 0 && <SavedToast key={cancelled} title="Ta demande de suppression est annulée." />}
    </>
  );
}
