"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ds/Button";
import { FullScreenStage } from "@/components/ds/FullScreenStage";
import { Logo } from "@/components/ds/Logo";
import { Mascot } from "@/components/ds/Mascot";
import { PendingPill } from "@/components/ds/PendingPill";
import { ResendCountdown } from "@/components/ds/ResendCountdown";
import { ResumeCodeCard } from "@/components/ds/ResumeCodeCard";
import { apiCall, errorMessage } from "@/lib/api-call";
import { formatInstant } from "@/lib/dates";

import { STEP_PATH, type SignupState } from "../signup-steps";
import { RESUME_CODE_KEY } from "../SignupDraft";
import { useSignupPolling } from "./useSignupPolling";

const noSubscription = () => () => {};

/** Code de reprise gardé dans l'onglet depuis W05 (absent après une reprise dans un autre navigateur). */
function readResumeCode(): string | null {
  try {
    return sessionStorage.getItem(RESUME_CODE_KEY);
  } catch {
    return null;
  }
}

/** W07 · Attente de l'accord du parent (polling), code de reprise, renvoi de la demande. */
export function WaitingScreen({ initial }: { initial: SignupState }) {
  const router = useRouter();
  const state = useSignupPolling(initial);
  const resumeCode = useSyncExternalStore(noSubscription, readResumeCode, () => null);
  const [noted, setNoted] = useState(false);
  const [resendError, setResendError] = useState<string>();
  // À l'étape `waiting`, l'API renvoie toujours la demande en cours
  const request = state.consentRequest as NonNullable<SignupState["consentRequest"]>;

  useEffect(() => {
    if (state.step !== "waiting") router.replace(STEP_PATH[state.step]);
  }, [state.step, router]);

  const resend = async (): Promise<number | void> => {
    setResendError(undefined);
    const result = await apiCall((api) =>
      api.POST("/api/accounts/consent-requests/{id}/resend/", { params: { path: { id: String(request.id) } } }),
    );
    if (result.ok) return result.data.resendInSec;
    setResendError(errorMessage(result, "tu"));
    return result.retryAfter;
  };

  return (
    <FullScreenStage topbar={<Logo height={28} />}>
      <Mascot pose="sleep" size={150} />
      <h1 className="text-3xl font-black text-ink-900">On attend l&apos;accord de ton parent…</h1>
      <p className="text-base font-semibold text-ink-600">
        On a envoyé un SMS au <strong className="text-ink-900">{request.parentPhoneMasked}</strong>. Cette page se
        met à jour toute seule dès qu&apos;il ou elle aura répondu.
      </p>
      <PendingPill label="En attente de la réponse…" />
      {resumeCode && !noted && (
        <div className="flex w-full flex-col items-center gap-3">
          <ResumeCodeCard code={resumeCode} expiresOn={formatInstant(state.expiresAt)} className="w-full" />
          <Button variant="outline" onClick={() => setNoted(true)}>
            J&apos;ai noté mon code
          </Button>
        </div>
      )}
      <p className="text-sm font-semibold text-ink-600">
        Ta demande reste valable jusqu&apos;au {formatInstant(request.expiresAt)}.
      </p>
      <ResendCountdown
        seconds={request.resendInSec}
        onResend={resend}
        label="Renvoyer la demande"
        countdownLabel="Renvoyer la demande dans"
        readyMessage="Tu peux renvoyer la demande."
      />
      <p role="alert" className="text-sm font-bold text-error-600">
        {resendError}
      </p>
    </FullScreenStage>
  );
}
