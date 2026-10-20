"use client";

import type { Schemas } from "@steamy/api-client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ds";
import { apiCall, errorMessage } from "@/lib/api-call";
import { formatInstant } from "@/lib/dates";
import { routes } from "@/lib/routes";

import { DeletionRule } from "./rule";

type Decision = "approve" | "refuse";

/**
 * WPD09 · demande de suppression envoyée par l'enfant (WD15, `?demande=<id>`) : motif et précisions de l'enfant,
 * règle D54, « Refuser la demande » (l'enfant est notifié) ou « Valider la suppression » (compte désactivé aussitôt).
 */
export function ChildDeletionRequest({ request }: { request: Schemas["DeletionRequest"] }) {
  const router = useRouter();
  const [pending, setPending] = useState<Decision | null>(null);
  const [error, setError] = useState<string>();
  // Une seule décision à la fois, même sur un double clic plus rapide que le rendu du bouton occupé
  const inFlight = useRef(false);

  async function decide(decision: Decision) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(decision);
    setError(undefined);
    const path = { params: { path: { id: String(request.id) } } };
    const result = await apiCall((api) =>
      decision === "approve"
        ? api.POST("/api/accounts/deletion-requests/{id}/approve/", path)
        : api.POST("/api/accounts/deletion-requests/{id}/refuse/", path),
    );
    inFlight.current = false;
    setPending(null);
    if (result.ok) {
      router.push(routes.parent.child(request.accountId, decision === "approve" ? "supprime" : "demande-refusee"));
      return;
    }
    if (result.code === "NOT_FOUND") router.refresh();
    setError(errorMessage(result, "vous"));
  }

  return (
    <section
      aria-labelledby="demande-suppression"
      className="flex flex-col gap-4.5 rounded-[22px] border-2 border-error-300 bg-surface p-5 sm:p-7"
    >
      <div className="flex flex-col gap-1">
        <h2 id="demande-suppression" className="m-0 text-xl font-black text-ink-900">
          {request.firstName} demande la suppression de son compte
        </h2>
        <p className="m-0 text-[13px] font-bold text-ink-600">
          Reçue le <time dateTime={request.createdAt}>{formatInstant(request.createdAt)}</time>
        </p>
      </div>
      <dl className="m-0 flex flex-col gap-2 rounded-[14px] bg-ink-50 p-4 text-sm">
        <div>
          <dt className="font-black text-ink-900">Motif</dt>
          <dd className="m-0 font-semibold text-ink-700">{request.reason?.label ?? "Aucun motif indiqué"}</dd>
        </div>
        {request.note && (
          <div>
            <dt className="font-black text-ink-900">Précisions</dt>
            <dd className="m-0 font-semibold text-ink-700">« {request.note} »</dd>
          </div>
        )}
      </dl>
      <DeletionRule firstName={request.firstName} />
      {error && (
        <p role="alert" className="m-0 text-sm font-bold text-error-700">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" block loading={pending === "refuse"} onClick={() => void decide("refuse")}>
          Refuser la demande
        </Button>
        <Button variant="danger" block loading={pending === "approve"} onClick={() => void decide("approve")}>
          Valider la suppression
        </Button>
      </div>
    </section>
  );
}
