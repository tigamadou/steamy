"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { OtpForm, type OtpChallenge } from "@/components/auth/OtpForm";
import { Button, ErrorSummary, Field, PasswordInput, PhoneInput, type PhoneCountry } from "@/components/ds";
import { PasswordForm } from "@/features/account/PasswordForm";
import { SavedToast } from "@/features/account/SavedToast";
import { apiCall, errorMessage } from "@/lib/api-call";
import { submitWith } from "@/lib/form";

import { EditableCard } from "./EditableCard";

type Mode = "phone" | "password" | null;
type PhoneState = {
  attempt: number;
  phone?: string;
  password?: string;
  error?: string;
  /** Défi OTP envoyé au nouveau numéro, avec ce qui a servi à le demander. */
  challenge?: OtpChallenge;
};

/**
 * Changement de numéro (D24) : nouveau numéro et mot de passe actuel, puis code reçu par SMS sur le **nouveau**
 * numéro (`phone-change/` puis `phone-change/verify/`). Le numéro ne change qu'après un code valide.
 */
function PhoneChange({
  countries,
  onDone,
  onCancel,
}: {
  countries: PhoneCountry[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [challenge, setChallenge] = useState<OtpChallenge>();
  const [state, action, pending] = useActionState(
    async (previous: PhoneState, form: FormData): Promise<PhoneState> => {
      const attempt = previous.attempt + 1;
      const phone = String(form.get("phone") ?? "");
      const password = String(form.get("password") ?? "");
      const errors: PhoneState = { attempt };
      if (!phone) errors.phone = "Saisissez un numéro valide pour ce pays.";
      if (!password) errors.password = "Indiquez votre mot de passe actuel.";
      if (errors.phone || errors.password) return errors;
      const result = await apiCall((api) => api.POST("/api/accounts/me/phone-change/", { body: { phone, password } }));
      if (result.ok) {
        setChallenge(result.data);
        return { attempt };
      }
      if (result.code === "PHONE_TAKEN") return { attempt, phone: "Ce numéro est déjà utilisé par un autre compte." };
      if (result.fields.phone || result.fields.password) {
        return { attempt, phone: result.fields.phone, password: result.fields.password };
      }
      if (result.code === "INVALID_CREDENTIALS") return { attempt, password: "Mot de passe incorrect." };
      return { attempt, error: errorMessage(result, "vous") };
    },
    { attempt: 0 },
  );

  if (challenge) {
    const verify = async (code: string) => {
      const result = await apiCall((api) =>
        api.POST("/api/accounts/me/phone-change/verify/", { body: { challengeId: challenge.challengeId, code } }),
      );
      if (result.ok) onDone();
      return result;
    };
    return (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-sm font-semibold text-ink-700">
          Nous avons envoyé un code à 6 chiffres au{" "}
          <strong className="text-ink-900">{challenge.destinationMasked}</strong>. Votre numéro ne change qu&apos;une fois
          ce code validé.
        </p>
        <OtpForm
          challenge={challenge}
          channel="sms"
          verify={verify}
          onChallenge={setChallenge}
          submitLabel="Valider le nouveau numéro"
          editLabel="Modifier le numéro"
          onEdit={() => setChallenge(undefined)}
        />
      </div>
    );
  }

  const errors = [
    state.phone && { field: "connexion-telephone", message: state.phone },
    state.password && { field: "connexion-mot-de-passe", message: state.password },
    state.error && { message: state.error },
  ].filter((item) => !!item);

  return (
    <form onSubmit={submitWith(action)} noValidate aria-label="Changer de numéro" className="flex flex-col gap-4">
      <ErrorSummary title="Corrigez les erreurs suivantes :" errors={errors} focusKey={state.attempt} />
      <Field
        label="Nouveau numéro"
        id="connexion-telephone"
        required
        hint="Il servira à vous connecter. Un code de vérification y sera envoyé par SMS."
        error={state.phone}
      >
        <PhoneInput name="phone" countries={countries} countryLabel="Pays du nouveau numéro" />
      </Field>
      <Field label="Mot de passe actuel" id="connexion-mot-de-passe" required error={state.password}>
        <PasswordInput name="password" autoComplete="current-password" />
      </Field>
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" loading={pending}>
          Recevoir le code
        </Button>
      </div>
    </form>
  );
}

/**
 * Connexion de WPD08 (S4) : le numéro de téléphone, qui sert d'identifiant, et le mot de passe. Chacun se change ici :
 * numéro par OTP sur le nouveau numéro (D24), mot de passe avec les règles `PwReq` (D25).
 */
export function ConnectionCard({ phone, countries }: { phone: string | null; countries: PhoneCountry[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [changed, setChanged] = useState(0);

  return (
    <>
      <EditableCard
        title="Connexion"
        editing={mode !== null}
        onEdit={() => setMode("phone")}
        editLabel="Changer de numéro"
        rows={[
          { label: "Numéro de téléphone", value: phone },
          { label: "Mot de passe", value: "••••••••" },
        ]}
      >
        {mode === "phone" ? (
          <PhoneChange
            countries={countries}
            onCancel={() => setMode(null)}
            onDone={() => {
              setMode(null);
              setChanged((n) => n + 1);
              router.refresh();
            }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <PasswordForm register="vous" />
            <Button variant="ghost" onClick={() => setMode(null)} className="self-end">
              Fermer
            </Button>
          </div>
        )}
      </EditableCard>
      {mode === null && (
        <Button variant="outline" size="sm" onClick={() => setMode("password")} className="self-start">
          Changer de mot de passe
        </Button>
      )}
      {changed > 0 && (
        <SavedToast key={changed} title="Votre numéro est modifié. Utilisez-le désormais pour vous connecter." />
      )}
    </>
  );
}
