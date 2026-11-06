"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ds/Button";
import { Field } from "@/components/ds/Field";
import { Input } from "@/components/ds/Input";
import { Modal } from "@/components/ds/Modal";
import { Textarea } from "@/components/ds/Textarea";
import { errorMessage } from "@/lib/api-call";
import { formatKpiValue } from "@/lib/backoffice/format";

import { callWithStatus } from "./call";

export type RefundRequestModalProps = {
  paymentId: number;
  status: string;
  /** Reste remboursable, calculé par l'API (0 si le paiement n'est pas réussi). */
  refundable: number;
};

type Errors = { amount?: string; reason?: string };

/**
 * « Demander un remboursement » : visible pour un paiement réussi dont il reste quelque chose à rembourser. Montant
 * prérempli au reste, borné, motif obligatoire ; l'API refait les contrôles (champ en erreur, ou état changé : 409).
 */
export function RefundRequestModal({ paymentId, status, refundable }: RefundRequestModalProps) {
  const router = useRouter();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  function show() {
    setAmount(String(refundable));
    setReason("");
    setErrors({});
    setFormError(null);
    setDone(false);
    setOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount.replace(/\s/g, ""));
    const local: Errors = {};
    if (!Number.isInteger(value) || value < 1 || value > refundable) {
      local.amount = `Saisissez un montant entier entre 1 et ${formatKpiValue(refundable, "fcfa")}.`;
    }
    if (reason.trim() === "") local.reason = "Le motif est obligatoire.";
    setErrors(local);
    setFormError(null);
    if (local.amount || local.reason) return;

    setSending(true);
    const { result } = await callWithStatus((api) =>
      api.POST("/api/backoffice/payments/{id}/refunds/", {
        params: { path: { id: paymentId } },
        body: { amount: value, reason: reason.trim() },
      }),
    );
    setSending(false);
    if (result.ok) {
      setOpen(false);
      setDone(true);
      router.refresh();
      return;
    }
    if (result.code === "NOT_AUTHENTICATED" || result.code === "OTP_REQUIRED") {
      router.refresh();
      return;
    }
    if (result.fields.amount || result.fields.reason) {
      setErrors({ amount: result.fields.amount, reason: result.fields.reason });
      return;
    }
    setFormError(result.code === "NETWORK_UNAVAILABLE" ? errorMessage(result, "vous") : result.message || errorMessage(result, "vous"));
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {status === "succeeded" && refundable > 0 && (
        <Button variant="ink" size="sm" onClick={show}>
          Demander un remboursement
        </Button>
      )}
      <p role="status" className="m-0 text-sm font-bold text-ink-800 empty:hidden">
        {done && "Remboursement demandé : il apparaît dans les remboursements à traiter."}
      </p>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        tone="ink"
        title="Demander un remboursement"
        actions={
          <>
            <Button variant="ink-outline" size="sm" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" form={formId} variant="ink" size="sm" loading={sending}>
              Demander le remboursement
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-3.5 text-left">
          <Field label="Montant (FCFA)" required error={errors.amount} hint={`Reste remboursable : ${formatKpiValue(refundable, "fcfa")}.`}>
            <Input inputMode="numeric" autoComplete="off" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </Field>
          <Field label="Motif" required error={errors.reason}>
            <Textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
          </Field>
          <p role="alert" className="m-0 text-sm font-bold text-error-700 empty:hidden">
            {formError}
          </p>
        </form>
      </Modal>
    </div>
  );
}
