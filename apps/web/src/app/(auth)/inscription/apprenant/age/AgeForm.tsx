"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { NumberStepper } from "@/components/ds/NumberStepper";
import { apiCall, errorMessage } from "@/lib/api-call";

import { RESUME_CODE_KEY, useSignupDraft } from "../SignupDraft";

/** Bornes d'âge (D23) : le serveur reste juge (`AGE_OUT_OF_RANGE`). */
const MIN_AGE = 10;
const MAX_AGE = 17;
const DEFAULT_AGE = 13;

type State = { attempt: number; error?: string };

/** W05 · Âge : « Continuer » crée l'inscription en attente (compte inactif, code de reprise unique). */
export function AgeForm() {
  const router = useRouter();
  const { draft, update } = useSignupDraft();
  const [age, setAge] = useState(draft.age ?? DEFAULT_AGE);
  const missing = !draft.username;

  // Rechargement : le brouillon de W04 est perdu, retour à W04 champs vides
  useEffect(() => {
    if (missing) router.replace("/inscription/apprenant/identite");
  }, [missing, router]);

  const [state, action, pending] = useActionState(async (previous: State): Promise<State> => {
    const attempt = previous.attempt + 1;
    update({ age });
    const result = await apiCall((api) =>
      api.POST("/api/auth/learner-signup/", {
        body: {
          firstName: draft.firstName,
          lastName: draft.lastName,
          username: draft.username,
          age,
          privacyAccepted: draft.privacyAccepted,
        },
      }),
    );
    if (result.ok) {
      try {
        sessionStorage.setItem(RESUME_CODE_KEY, result.data.resumeCode);
      } catch {
        // Stockage indisponible : le code reste affiché une fois en W07 depuis la mémoire de l'onglet
      }
      // Le brouillon reste en mémoire : le vider réveillerait la garde de cet écran avant la navigation. Il
      // disparaît avec l'onglet ; l'API est désormais la source de vérité (SignupGate).
      router.replace("/inscription/apprenant/parent");
      return { attempt };
    }
    if (result.code === "USERNAME_TAKEN" || result.code === "USERNAME_INVALID" || result.fields.username) {
      update({ usernameTaken: result.code === "USERNAME_TAKEN" });
      router.replace("/inscription/apprenant/identite");
      return { attempt };
    }
    if (result.code === "AGE_OUT_OF_RANGE") return { attempt, error: "Steamy est fait pour les 10 à 17 ans." };
    return { attempt, error: errorMessage(result, "tu") };
  }, { attempt: 0 });

  if (missing) return null;

  return (
    <form action={action} noValidate className="flex flex-col items-center gap-6">
      <ErrorSummary errors={state.error ? [{ message: state.error }] : []} focusKey={state.attempt} />
      <NumberStepper min={MIN_AGE} max={MAX_AGE} value={age} onChange={setAge} label="Ton âge" unit="ans" />
      <p className="flex max-w-[340px] items-start gap-2.5 rounded-lg bg-amber-100 p-3.5 text-sm font-bold text-amber-700">
        <span aria-hidden className="text-xl">
          👨‍👩‍👧
        </span>
        À l&apos;étape suivante, on demandera l&apos;accord d&apos;un parent : c&apos;est lui qui valide ton
        inscription.
      </p>
      <Button type="submit" block size="lg" loading={pending} iconRight="arrow-right">
        Continuer
      </Button>
    </form>
  );
}
