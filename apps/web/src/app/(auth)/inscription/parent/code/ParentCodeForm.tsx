"use client";

import { useRouter } from "next/navigation";

import { OtpForm } from "@/components/auth/OtpForm";
import { Loader } from "@/components/ds/Loader";
import { apiCall } from "@/lib/api-call";
import { clearFlow, readFlow } from "@/lib/auth/flow-storage";

import { useParentChallenge } from "../useParentChallenge";

/**
 * WP02 · Code SMS (D24). Une fois le numéro prouvé, l'API dit s'il a déjà un compte (C13) : connexion, en revenant
 * à la demande de l'enfant s'il y en a une en attente.
 */
export function ParentCodeForm() {
  const router = useRouter();
  const [challenge, update] = useParentChallenge();
  if (!challenge) return <Loader label="Chargement…" />;

  const verify = async (code: string) => {
    const result = await apiCall((api) =>
      api.POST("/api/auth/parent-signup/verify/", { body: { challengeId: challenge.challengeId, code } }),
    );
    if (result.ok) {
      if (result.data.existingAccount) {
        clearFlow("parentChallenge");
        const next = readFlow<string>("consentToken") ? "&next=%2Fconsentement" : "";
        router.replace(`/connexion?compte=existant${next}`);
      } else {
        router.push("/inscription/parent/mot-de-passe");
      }
    }
    return result;
  };

  return (
    <>
      <p className="font-semibold text-ink-600">
        Nous avons envoyé un code à 6 chiffres au <strong className="text-ink-900">{challenge.destinationMasked}</strong>.
      </p>
      <OtpForm
        challenge={challenge}
        channel="sms"
        verify={verify}
        onChallenge={update}
        submitLabel="Vérifier le code"
        editLabel="Modifier le numéro"
        onEdit={() => router.push("/inscription/parent")}
      />
    </>
  );
}
