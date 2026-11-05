"use client";

import type { Schemas } from "@steamy/api-client";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ds/Button";
import { Field } from "@/components/ds/Field";
import { Input } from "@/components/ds/Input";
import { Modal } from "@/components/ds/Modal";
import { errorMessage } from "@/lib/api-call";
import { formatKpiValue } from "@/lib/backoffice/format";

import { callWithStatus } from "./call";

export type RefundFeedback = { tone: "info" | "error"; text: string };

export type ProcessRefundModalProps = {
  refund: Pick<Schemas["BackofficeRefund"], "id" | "amount" | "orderReference">;
  /** Résultat à annoncer hors de la ligne : la ligne quitte la liste « À traiter » dès le rafraîchissement. */
  onDone: (feedback: RefundFeedback) => void;
};

/**
 * « Marquer comme remboursé » : une fois l'argent rendu chez l'opérateur, on saisit la référence du remboursement
 * (obligatoire). L'API refuse un remboursement déjà fait (409) : la liste est alors simplement rafraîchie.
 */
export function ProcessRefundModal({ refund, onDone }: ProcessRefundModalProps) {
  const router = useRouter();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function show() {
    setReference("");
    setFieldError(undefined);
    setFormError(null);
    setOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (reference.trim() === "") {
      setFieldError("La référence du remboursement est obligatoire.");
      return;
    }
    setFieldError(undefined);
    setSending(true);
    const { result, status } = await callWithStatus((api) =>
      api.POST("/api/backoffice/refunds/{id}/process/", {
        params: { path: { id: refund.id } },
        body: { reference: reference.trim() },
      }),
    );
    setSending(false);
    if (result.ok) {
      setOpen(false);
      onDone({ tone: "info", text: `Remboursement de la commande ${refund.orderReference} marqué comme fait.` });
      router.refresh();
      return;
    }
    if (status === 409) {
      setOpen(false);
      onDone({ tone: "error", text: "Ce remboursement est déjà marqué comme remboursé." });
      router.refresh();
      return;
    }
    if (result.code === "NOT_AUTHENTICATED" || result.code === "OTP_REQUIRED") {
      router.refresh();
      return;
    }
    if (result.fields.reference) {
      setFieldError(result.fields.reference);
      return;
    }
    setFormError(result.code === "NETWORK_UNAVAILABLE" ? errorMessage(result, "vous") : result.message || errorMessage(result, "vous"));
  }

  return (
    <>
      <Button variant="ink-outline" size="sm" onClick={show}>
        Marquer comme remboursé
        <span className="sr-only"> : commande {refund.orderReference}</span>
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        tone="ink"
        title="Marquer comme remboursé"
        actions={
          <>
            <Button variant="ink-outline" size="sm" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" form={formId} variant="ink" size="sm" loading={sending}>
              Confirmer
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-3.5 text-left">
          <p className="m-0">
            Remboursement de {formatKpiValue(refund.amount, "fcfa")} sur la commande {refund.orderReference}.
          </p>
          <Field
            label="Référence du remboursement"
            required
            error={fieldError}
            hint="Référence saisie dans le tableau de bord FedaPay ou chez l'opérateur"
          >
            <Input autoComplete="off" value={reference} onChange={(event) => setReference(event.target.value)} />
          </Field>
          <p role="alert" className="m-0 text-sm font-bold text-error-700 empty:hidden">
            {formError}
          </p>
        </form>
      </Modal>
    </>
  );
}
