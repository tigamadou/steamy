import type { Schemas } from "@steamy/api-client";
import { notFound } from "next/navigation";

import { Breadcrumb, Button, SkeletonBlock } from "@/components/ds";
import type { BadgeTone } from "@/components/ds/Badge";
import { ConsentRequestCard } from "@/components/ds/ConsentRequestCard";
import { getServerApi } from "@/lib/api";
import { readOrNull } from "@/lib/api-read";
import { formatInstant } from "@/lib/dates";
import { routes } from "@/lib/routes";

import { ConsentDecision } from "./ConsentDecision";
import { ConsentOrigin } from "./ConsentOrigin";

export type ConsentRequest = Schemas["ConsentRequest"];

/** Statuts d'une demande close : badge de la carte, écran en lecture seule. */
export const CLOSED_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  accepted: { label: "Acceptée", tone: "success" },
  refused: { label: "Refusée", tone: "error" },
  expired: { label: "Expirée", tone: "neutral" },
  cancelled: { label: "Annulée", tone: "neutral" },
};

/** Encart d'une demande close (WPD05 en lecture seule, maquette de l'étape 4.0). */
function closedNote(request: ConsentRequest): { icon: string; text: string } {
  const resolved = request.resolvedAt ? ` le ${formatInstant(request.resolvedAt)}` : "";
  switch (request.status) {
    case "accepted":
      return {
        icon: "✅",
        text: `Vous avez accepté cette demande${resolved} : ${request.firstName} peut terminer son inscription.`,
      };
    case "refused":
      return {
        icon: "✋",
        text: `Vous avez refusé cette demande${resolved}${
          request.refusalReason ? ` (motif : « ${request.refusalReason.label} »)` : ""
        }. Une nouvelle demande sera possible 30 jours après votre refus.`,
      };
    case "expired":
      return {
        icon: "⌛",
        text: `Cette demande a expiré le ${formatInstant(request.expiresAt)}, sans réponse pendant 7 jours. Votre enfant peut vous en envoyer une nouvelle.`,
      };
    default:
      return {
        icon: "🚫",
        text: "Cette demande a été annulée : votre enfant en a envoyé une plus récente ou a abandonné son inscription.",
      };
  }
}

/** WPD05 · contenu : carte de l'enfant (D20), origine, encart du responsable légal et décision, ou lecture seule. */
export function ConsentRequestView({ request }: { request: ConsentRequest }) {
  const pending = request.status === "pending";
  const note = pending ? null : closedNote(request);
  return (
    <div className="mx-auto flex w-full max-w-160 flex-col gap-4">
      <Breadcrumb items={[{ label: "Accueil", href: routes.parent.home }, { label: "Demande de consentement" }]} />
      <section
        aria-label="Demande de consentement"
        className="flex flex-col gap-4 rounded-[22px] border-2 border-ink-100 bg-surface p-5 sm:p-7"
      >
        {note && (
          <p role="status" className="m-0 flex items-start gap-3 rounded-lg bg-ink-50 p-4 font-bold text-ink-700">
            <span aria-hidden>{note.icon}</span>
            {note.text}
          </p>
        )}
        <ConsentRequestCard
          firstName={request.firstName}
          lastName={request.lastName}
          username={request.username}
          age={request.age}
          relationship={request.relationship.parentLabel || request.relationship.label}
          expiresOn={pending ? formatInstant(request.expiresAt) : undefined}
          badge={CLOSED_STATUS[request.status]}
        />
        <ConsentOrigin request={request} />
        {pending ? (
          <>
            <p className="m-0 flex items-start gap-3 rounded-lg border-2 border-primary-100 bg-primary-50 p-4 text-sm font-bold text-ink-700">
              <span aria-hidden>🔒</span>
              En acceptant, vous confirmez être le responsable légal de {request.firstName}. Si vous refusez, la demande
              est close : une nouvelle demande sera possible dans 30 jours.
            </p>
            <ConsentDecision id={request.id} firstName={request.firstName} />
          </>
        ) : (
          <Button href={routes.parent.home} variant="outline" block>
            Retour à l&apos;accueil
          </Button>
        )}
      </section>
    </div>
  );
}

/** WPD05 · demande adressée au numéro du parent, lue côté serveur ; celle d'un autre numéro est « introuvable ». */
export async function ConsentRequestScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Identifiant illisible : « Demande introuvable », sans appeler l'API
  if (!/^\d+$/.test(id)) notFound();
  const api = await getServerApi();
  const result = await api.GET("/api/accounts/consent-requests/{id}/", { params: { path: { id } } });
  if (result.response.status === 404) notFound();
  const request = readOrNull(result);
  if (!request) return null;
  return <ConsentRequestView request={request} />;
}

/** Squelette de WPD05 : fil d'Ariane, carte de l'enfant, origine et actions. */
export function ConsentRequestSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement de la demande…"
      className="mx-auto flex w-full max-w-160 flex-col gap-4"
    >
      <SkeletonBlock className="h-4 w-60 rounded-sm" />
      <SkeletonBlock className="h-48 rounded-[22px]" />
      <SkeletonBlock className="h-20 rounded-[18px]" />
      <SkeletonBlock className="h-14 rounded-[18px]" />
    </div>
  );
}
