"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ds/Button";
import { Loader } from "@/components/ds/Loader";
import { Mascot } from "@/components/ds/Mascot";
import { WebShell } from "@/components/ds/WebShell";
import { apiCall, errorMessage, type ErrorCode } from "@/lib/api-call";
import { clearFlow, readFlow } from "@/lib/auth/flow-storage";
import { routes } from "@/lib/routes";

type Outcome = { kind: "loading" } | { kind: "choose" } | { kind: "closed"; title: string; text: string };

/** États terminaux du lien, sans aucun détail sur l'enfant (`CONSENT_*`, jeton inconnu ou déjà utilisé). */
const CLOSED: Partial<Record<ErrorCode, { title: string; text: string }>> = {
  CONSENT_REQUEST_EXPIRED: {
    title: "Cette demande a expiré",
    text: "Une demande reste valable 7 jours. Votre enfant peut vous en envoyer une nouvelle.",
  },
  CONSENT_ALREADY_RESOLVED: {
    title: "Cette demande a déjà reçu une réponse",
    text: "Retrouvez vos décisions dans votre espace parent.",
  },
  PERMISSION_DENIED: {
    title: "Ce lien est réservé au parent",
    text: "Déconnectez-vous, puis connectez-vous avec le compte parent du numéro qui a reçu le SMS.",
  },
  CONSENT_PHONE_MISMATCH: {
    title: "Cette demande ne vous est pas adressée",
    text: "Elle a été envoyée à un autre numéro que celui de votre compte. Connectez-vous avec le compte de ce numéro.",
  },
};

const LINK_INVALID = {
  title: "Lien incomplet ou déjà utilisé",
  text: "Ouvrez le dernier lien reçu par SMS. Si le problème persiste, contactez l'équipe Steamy.",
};

/**
 * Atterrissage du lien SMS (2.7) : un parent connecté rattache la demande (`claim`) et l'ouvre (WP05, qui renvoie
 * vers WPD05 un parent au profil complet). Sinon, il
 * choisit entre la connexion (retour ici) et la création de son compte (WP01, numéro rappelé).
 */
export function ConsentLanding() {
  const router = useRouter();
  const [outcome, setOutcome] = useState<Outcome>({ kind: "loading" });

  useEffect(() => {
    const token = readFlow<string>("consentToken");
    if (!token) {
      // Ni lien ni jeton gardé : rien à rattacher
      void Promise.resolve().then(() => setOutcome({ kind: "closed", ...LINK_INVALID }));
      return;
    }
    let current = true;
    void apiCall((api) => api.POST("/api/accounts/consent-requests/claim/", { body: { token } })).then((result) => {
      if (!current) return;
      if (result.ok) {
        clearFlow("consentToken");
        router.replace(`/inscription/parent/demande/${result.data.id}`);
        return;
      }
      if (result.code === "NOT_AUTHENTICATED") {
        setOutcome({ kind: "choose" });
        return;
      }
      clearFlow("consentToken");
      setOutcome({
        kind: "closed",
        ...(CLOSED[result.code] ??
          (result.code === "NOT_FOUND" || result.code === "VALIDATION_ERROR"
            ? LINK_INVALID
            : { title: "Demande indisponible", text: errorMessage(result, "vous") })),
      });
    });
    return () => {
      current = false;
    };
  }, [router]);

  if (outcome.kind === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader label="Ouverture de la demande…" />
      </div>
    );
  }

  if (outcome.kind === "closed") {
    return (
      <WebShell
        kicker="Demande de consentement"
        title={outcome.title}
        sub={outcome.text}
        brand={<Mascot pose="sad" size={200} hue="var(--surface)" />}
      >
        <Button href={routes.login()} block size="lg">
          Se connecter
        </Button>
        <Button href={routes.contact("question")} variant="outline" block>
          Contacter l&apos;équipe Steamy
        </Button>
      </WebShell>
    );
  }

  return (
    <WebShell
      kicker="Demande de consentement"
      title="Votre enfant vous demande votre accord"
      sub="Pour voir sa demande et y répondre, connectez-vous à votre compte parent ou créez-le en quelques minutes."
      brand={<Mascot pose="wave" size={220} hue="var(--surface)" />}
    >
      <Button href={routes.login("/consentement")} block size="lg">
        J&apos;ai déjà un compte
      </Button>
      <Button href="/inscription/parent" variant="outline" block size="lg">
        Créer mon compte
      </Button>
    </WebShell>
  );
}
