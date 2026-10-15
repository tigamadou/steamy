"use client";

import { useRouter } from "next/navigation";

import { OtpForm } from "@/components/auth/OtpForm";
import { Mascot } from "@/components/ds/Mascot";
import { WebShell } from "@/components/ds/WebShell";
import { apiCall } from "@/lib/api-call";

import { useResetFlow } from "../ResetFlow";
import { useFlowGuard } from "../useFlowGuard";

/** WL03 · Code reçu par SMS (parent) ou par email (enseignant), destinataire masqué. */
export function CodeScreen() {
  const router = useRouter();
  const { flow, update } = useResetFlow();
  const challenge = flow.challenge;
  if (!useFlowGuard(challenge !== undefined) || !challenge) return null;
  const sms = flow.channel === "sms";

  const verify = async (code: string) => {
    const result = await apiCall((api) =>
      api.POST("/api/auth/password-reset/verify/", { body: { challengeId: challenge.challengeId, code } }),
    );
    if (result.ok) {
      update({ resetToken: result.data.resetToken });
      router.push("/mot-de-passe-oublie/nouveau");
    }
    return result;
  };

  return (
    <WebShell
      kicker="Réinitialisation · étape 2"
      title="Saisissez le code reçu"
      sub={`Si un compte Steamy correspond, un code à 6 chiffres vient d'être envoyé à ${challenge.destinationMasked}.`}
      brand={
        <>
          <Mascot pose="idle" size={210} hue="var(--surface)" />
          <span aria-hidden className="text-6xl">
            📩
          </span>
        </>
      }
    >
      <OtpForm
        challenge={challenge}
        channel={flow.channel}
        verify={verify}
        onChallenge={(next) => update({ challenge: next })}
        submitLabel="Vérifier le code"
        editLabel={sms ? "Modifier le numéro" : "Modifier l'adresse email"}
        onEdit={() => router.push("/mot-de-passe-oublie")}
      />
    </WebShell>
  );
}
