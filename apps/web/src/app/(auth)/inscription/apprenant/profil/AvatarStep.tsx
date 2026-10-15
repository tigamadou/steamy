"use client";

import { useActionState, useState } from "react";

import { AvatarPicker } from "@/components/ds/AvatarPicker";
import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Loader } from "@/components/ds/Loader";
import { errorMessage } from "@/lib/api-call";
import { submitWith } from "@/lib/form";
import { useReferential } from "@/lib/use-referential";

import { useLearnerProfileSave } from "./useProfileSave";

type State = { attempt: number; error?: string };

/** W14 · Avatar : grille des avatars de l'API, aucun présélectionné, puis W15. */
export function AvatarStep() {
  const save = useLearnerProfileSave();
  const avatars = useReferential("avatars");
  const [avatar, setAvatar] = useState<string>();

  const [state, action, pending] = useActionState(async (previous: State): Promise<State> => {
    const attempt = previous.attempt + 1;
    const failure = await save({ avatar });
    return failure ? { attempt, error: errorMessage(failure, "tu") } : { attempt };
  }, { attempt: 0 });

  if (avatars.status === "error") {
    return (
      <div className="flex flex-col items-center gap-3">
        <p role="alert" className="font-bold text-error-600">
          Impossible de charger les avatars.
        </p>
        <Button variant="outline" onClick={avatars.retry}>
          Réessayer
        </Button>
      </div>
    );
  }
  if (!avatars.items) return <Loader label="Chargement des avatars…" />;

  return (
    <form onSubmit={submitWith(action)} noValidate className="flex w-full flex-col gap-6">
      <ErrorSummary errors={state.error ? [{ message: state.error }] : []} focusKey={state.attempt} />
      <AvatarPicker legend="Choisis ton avatar" legendHidden name="avatar" avatars={avatars.items} value={avatar} onChange={setAvatar} />
      <Button type="submit" block size="lg" variant="secondary" loading={pending} disabled={!avatar}>
        Terminer mon profil 🚀
      </Button>
    </form>
  );
}
