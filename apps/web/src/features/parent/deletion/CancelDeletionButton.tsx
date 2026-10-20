"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ds";
import { apiCall, errorMessage } from "@/lib/api-call";

/**
 * « Annuler la suppression » (WPD02, WPD03) : pendant les 30 jours qui précèdent l'anonymisation (D54),
 * `DELETE accounts/children/{id}/deletion/` réactive le compte ; l'enfant peut de nouveau se connecter.
 */
export function CancelDeletionButton({ childId, firstName }: { childId: number; firstName: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const cancel = () =>
    startTransition(async () => {
      setError(undefined);
      const result = await apiCall((api) =>
        api.DELETE("/api/accounts/children/{id}/deletion/", { params: { path: { id: String(childId) } } }),
      );
      if (result.ok) {
        router.refresh();
        return;
      }
      setError(errorMessage(result, "vous"));
    });
  return (
    <div className="flex flex-col gap-1.5">
      <Button variant="outline" loading={pending} onClick={cancel}>
        Annuler la suppression<span className="sr-only"> du compte de {firstName}</span>
      </Button>
      {error && (
        <p role="alert" className="m-0 text-[13px] font-bold text-error-700">
          {error}
        </p>
      )}
    </div>
  );
}
