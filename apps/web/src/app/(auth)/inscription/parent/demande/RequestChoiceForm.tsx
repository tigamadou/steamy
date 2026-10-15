"use client";

import type { Schemas } from "@steamy/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ds/Button";
import { UserTypeCardGroup, type UserTypeOption } from "@/components/ds/UserTypeCard";
import { apiCall, errorMessage } from "@/lib/api-call";

const OPTIONS: UserTypeOption[] = [
  {
    value: "demande",
    emoji: "📩",
    title: "Oui, mon enfant m'a envoyé une demande",
    description: "Mon enfant a commencé son inscription et attend mon accord.",
    color: "primary-500",
  },
  {
    value: "espace",
    emoji: "🏡",
    title: "Non, je crée mon espace",
    description: "Je veux inscrire mon enfant ou suivre ses progrès moi-même.",
    color: "cat-ia",
    tone: "light",
  },
];

const PROFILE_START = "/inscription/parent/profil/localisation";

type Request = Schemas["ConsentRequest"];

/**
 * WP04 · Demande reçue ? « Oui » : demandes en attente adressées au numéro vérifié (une → WP05, plusieurs → liste,
 * aucune → message puis profil) ; « Non » : profil (WP07).
 */
export function RequestChoiceForm() {
  const router = useRouter();
  const [choice, setChoice] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [requests, setRequests] = useState<Request[]>();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Lu dans le formulaire : un choix fait avant l'hydratation (réseau lent) compte aussi
    const value = String(new FormData(event.currentTarget).get("demande") ?? "");
    if (!value) {
      setError("Choisissez une réponse pour continuer.");
      return;
    }
    if (value === "espace") {
      router.push(PROFILE_START);
      return;
    }
    setPending(true);
    const result = await apiCall((api) =>
      api.GET("/api/accounts/consent-requests/", { params: { query: { status: "pending" } } }),
    );
    setPending(false);
    if (!result.ok) {
      setError(errorMessage(result, "vous"));
      return;
    }
    const pendingRequests = result.data.results ?? [];
    if (pendingRequests.length === 1) {
      router.push(`/inscription/parent/demande/${pendingRequests[0].id}`);
      return;
    }
    setRequests(pendingRequests);
  };

  if (requests?.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="rounded-lg bg-info-50 p-4 font-bold text-info-700">
          Aucune demande en attente n&apos;est adressée à votre numéro. Si votre enfant vient de l&apos;envoyer,
          elle apparaîtra dans votre espace parent.
        </p>
        <Button href={PROFILE_START} block size="lg">
          Continuer
        </Button>
      </div>
    );
  }

  if (requests) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-black text-ink-900">Demandes en attente</h2>
        <ul className="flex flex-col gap-3">
          {requests.map((request) => (
            <li key={request.id}>
              <Link
                href={`/inscription/parent/demande/${request.id}`}
                className="flex items-center justify-between rounded-xl border-2 border-ink-100 bg-surface p-4 font-extrabold text-ink-900 hover:bg-ink-50"
              >
                {request.firstName} {request.lastName}
                <span className="text-sm font-bold text-primary-600">Voir la demande</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-7">
      <UserTypeCardGroup
        legend="Avez-vous reçu une demande de votre enfant ?"
        legendHidden
        name="demande"
        options={OPTIONS}
        value={choice}
        onChange={(value) => {
          setChoice(value);
          setError(undefined);
        }}
        required
        error={error}
      />
      <Button type="submit" block size="lg" loading={pending} iconRight="arrow-right">
        Continuer
      </Button>
    </form>
  );
}
