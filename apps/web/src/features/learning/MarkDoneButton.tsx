"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ds/Button";
import { apiCall, errorMessage } from "@/lib/api-call";

import { nextStepHref } from "./next-step";

/**
 * « Marquer comme terminée » (WJ03) : `POST learning/missions/{id}/complete/`, puis l'étape suivante renvoyée par
 * l'API (mission suivante, quiz ou certification). Le visionnage ne conditionne rien : l'API reste juge.
 */
export function MarkDoneButton({ missionId }: { missionId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const complete = () => {
    setError(null);
    startTransition(async () => {
      const result = await apiCall((api) =>
        api.POST("/api/learning/missions/{id}/complete/", { params: { path: { id: missionId } } }),
      );
      if (!result.ok) {
        setError(
          result.code === "CONTENT_LOCKED"
            ? "Cette mission n'est pas encore ouverte : termine d'abord les précédentes."
            : errorMessage(result, "tu"),
        );
        return;
      }
      router.push(nextStepHref(result.data.next));
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="secondary" iconRight="check" onClick={complete} loading={pending}>
        Marquer comme terminée
      </Button>
      <p role="alert" className="m-0 text-sm font-bold text-error-700 empty:hidden">
        {error}
      </p>
    </div>
  );
}
