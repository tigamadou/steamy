"use client";

import type { Schemas } from "@steamy/api-client";
import { useActionState, useState } from "react";

import { Button } from "@/components/ds/Button";
import { OTPInput } from "@/components/ds/OTPInput";
import { ResendCountdown } from "@/components/ds/ResendCountdown";
import { apiCall, errorMessage, type ApiFailure, type ApiResult } from "@/lib/api-call";
import { submitWith } from "@/lib/form";

export type OtpChallenge = Schemas["OtpChallenge"];

export type OtpFormProps = {
  challenge: OtpChallenge;
  /** Canal du code : libellés « reçu par SMS » ou « reçu par email ». */
  channel: "sms" | "email";
  /** Vérifie le code auprès de l'API ; la page enchaîne elle-même sur l'étape suivante en cas de succès. */
  verify: (code: string) => Promise<ApiResult<unknown>>;
  /** Défi renouvelé après un renvoi (nouveau délai, même identifiant). */
  onChallenge: (challenge: OtpChallenge) => void;
  submitLabel: string;
  /** « Modifier le numéro » : retour à l'étape de saisie. */
  editLabel: string;
  onEdit: () => void;
};

const LENGTH = 6;
type State = { attempt: number; error?: string; locked?: boolean };

// Erreurs d'OTP (D24) au vouvoiement : WL03 et WP02 s'adressent au parent ou à l'enseignant.
function otpMessage(failure: ApiFailure): { error: string; locked?: boolean } {
  switch (failure.code) {
    case "OTP_INVALID":
      return { error: failure.message || "Code incorrect. Vérifiez le message reçu." };
    case "OTP_EXPIRED":
      return { error: "Ce code a expiré. Demandez un nouveau code.", locked: true };
    case "OTP_TOO_MANY_ATTEMPTS":
      return { error: "Trop d'essais avec ce code. Demandez un nouveau code.", locked: true };
    case "OTP_DAILY_LIMIT":
      return {
        error: "Vous avez reçu le nombre maximal de codes pour aujourd'hui. Réessayez demain.",
        locked: true,
      };
    default:
      return { error: errorMessage(failure, "vous") };
  }
}

/**
 * Saisie d'un code à usage unique (WL03, WP02) : `OTPInput`, renvoi après le délai de l'API, erreurs inline.
 * Essais épuisés, code expiré ou plafond atteint : saisie désactivée jusqu'à un nouveau code.
 */
export function OtpForm({ challenge, channel, verify, onChallenge, submitLabel, editLabel, onEdit }: OtpFormProps) {
  const [state, action, pending] = useActionState(async (previous: State, form: FormData): Promise<State> => {
    const attempt = previous.attempt + 1;
    const code = String(form.get("code"));
    if (code.length < LENGTH) return { attempt, error: `Saisissez les ${LENGTH} chiffres du code.` };
    const result = await verify(code);
    return result.ok ? { attempt } : { attempt, ...otpMessage(result) };
  }, { attempt: 0 });

  // Un renvoi réussi efface l'erreur et le verrou de la tentative précédente
  const [clearedAt, setClearedAt] = useState(0);
  const [round, setRound] = useState(0);
  const [resendError, setResendError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const current = state.attempt > clearedAt;
  const error = resendError ?? (current ? state.error : undefined);
  const locked = (current && state.locked) || resendError !== undefined;

  const resend = async (): Promise<number | void> => {
    setNotice(undefined);
    const result = await apiCall((api) =>
      api.POST("/api/auth/otp/resend/", { body: { challengeId: challenge.challengeId } }),
    );
    if (!result.ok) {
      setResendError(
        result.code === "OTP_RESEND_TOO_EARLY"
          ? "Patientez encore un peu avant de demander un nouveau code."
          : otpMessage(result).error,
      );
      return result.retryAfter;
    }
    onChallenge(result.data);
    setResendError(undefined);
    setClearedAt(state.attempt);
    setRound((n) => n + 1);
    setNotice(`Un nouveau code a été envoyé à ${result.data.destinationMasked}.`);
    return result.data.resendInSec;
  };

  return (
    <form onSubmit={submitWith(action)} noValidate className="flex flex-col gap-5">
      <OTPInput
        key={round}
        name="code"
        length={LENGTH}
        autoFocus
        disabled={locked}
        error={error}
        label={`Code à ${LENGTH} chiffres reçu par ${channel === "sms" ? "SMS" : "email"}`}
      />
      <p aria-live="polite" className="text-center text-sm font-bold text-success-700">
        {notice}
      </p>
      <ResendCountdown
        seconds={challenge.resendInSec}
        onResend={resend}
        readyMessage="Vous pouvez renvoyer le code."
        className="self-center"
      />
      <div className="mt-2 flex flex-col gap-3">
        <Button type="submit" block size="lg" loading={pending} disabled={locked}>
          {submitLabel}
        </Button>
        <Button variant="ghost" onClick={onEdit}>
          {editLabel}
        </Button>
      </div>
    </form>
  );
}
