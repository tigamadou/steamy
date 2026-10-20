"use client";

import type { Schemas } from "@steamy/api-client";
import { useEffect, useState } from "react";

import { Loader } from "@/components/ds/Loader";
import { ErrorState } from "@/components/states/presets";
import { apiCall, errorMessage, type ApiFailure } from "@/lib/api-call";

import { forgetActivationToken, takeActivationToken } from "./activation-token";
import { ActivationForm } from "./ActivationForm";
import { InvalidInvitation } from "./InvalidInvitation";

type Loaded =
  | { kind: "invalid" }
  | { kind: "failure"; failure: ApiFailure }
  | { kind: "ready"; token: string; invitation: Schemas["TeacherInvitation"] };

/**
 * Écran d'activation enseignant (C6) : jeton lu dans le fragment du lien, invitation relue par
 * `POST auth/teacher-invitations/lookup/` (jeton dans le corps), puis formulaire, ou lien expiré ou déjà utilisé.
 */
export function TeacherActivation() {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ attempt: number; value: Loaded } | null>(null);

  useEffect(() => {
    let current = true;
    const settle = (value: Loaded) => {
      if (current) setLoaded({ attempt, value });
    };
    const token = takeActivationToken();
    if (!token) {
      settle({ kind: "invalid" });
    } else {
      apiCall((api) => api.POST("/api/auth/teacher-invitations/lookup/", { body: { token } })).then((result) => {
        if (result.ok) return settle({ kind: "ready", token, invitation: result.data });
        if (result.code === "INVITATION_INVALID") {
          forgetActivationToken();
          return settle({ kind: "invalid" });
        }
        settle({ kind: "failure", failure: result });
      });
    }
    return () => {
      current = false;
    };
  }, [attempt]);

  if (!loaded || loaded.attempt !== attempt) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader label="Vérification de votre invitation…" />
      </div>
    );
  }
  const { value } = loaded;
  if (value.kind === "invalid") return <InvalidInvitation />;
  if (value.kind === "failure") {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <ErrorState
          register="vous"
          headingLevel={1}
          detail={errorMessage(value.failure, "vous")}
          onRetry={() => setAttempt((n) => n + 1)}
        />
      </main>
    );
  }
  return <ActivationForm token={value.token} invitation={value.invitation} />;
}
