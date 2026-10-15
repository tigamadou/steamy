"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Loader } from "@/components/ds/Loader";
import { writeFlow } from "@/lib/auth/flow-storage";

/**
 * Lien du SMS de consentement : le jeton est gardé dans l'onglet puis retiré de l'URL et de l'historique
 * (`replace`) avant toute autre requête. La suite se joue sur `/consentement`.
 */
export function KeepToken({ token }: { token: string }) {
  const router = useRouter();
  useEffect(() => {
    writeFlow("consentToken", token);
    router.replace("/consentement");
  }, [token, router]);
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Loader label="Ouverture de la demande…" />
    </div>
  );
}
