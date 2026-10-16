"use client";

import type { Schemas } from "@steamy/api-client";
import { useEffect, useState } from "react";

import { Button, buttonClasses } from "@/components/ds/Button";
import { Icon } from "@/components/ds/Icon";
import { Loader } from "@/components/ds/Loader";
import { apiCall } from "@/lib/api-call";

/** Intervalle d'interrogation tant que le PDF se prépare (génération asynchrone, D33). */
export const PDF_POLL_MS = 5_000;

export type CertificateDownloadProps = {
  certificateId: number;
  status: Schemas["PdfStatusEnum"];
  /** URL de téléchargement servie par l'API (redirection vers une URL présignée, ADR 0005). */
  downloadUrl: string;
};

/**
 * « Télécharger la certification (PDF) » (WJ07) : état « Préparation… » tant que l'API répond `pending`, en
 * relisant `learning/certificates/` ; `failed` → message, le Support est prévenu côté serveur.
 */
export function CertificateDownload({ certificateId, status: initial, downloadUrl }: CertificateDownloadProps) {
  const [status, setStatus] = useState(initial);

  useEffect(() => {
    if (status !== "pending") return;
    const timer = window.setInterval(() => {
      void apiCall((api) => api.GET("/api/learning/certificates/", { params: { query: { pageSize: 100 } } })).then(
        (result) => {
          const found = result.ok ? result.data.results?.find((c) => c.id === certificateId) : undefined;
          if (found) setStatus(found.pdfStatus);
        },
      );
    }, PDF_POLL_MS);
    return () => window.clearInterval(timer);
  }, [status, certificateId]);

  if (status === "ready") {
    return (
      // Fichier servi par l'API (autre origine) : lien simple, sans routage ni préchargement Next
      <a href={downloadUrl} download className={buttonClasses({ size: "lg", className: "gap-2" })}>
        <Icon name="arrow-right" size={22} strokeWidth={2.5} />
        Télécharger la certification (PDF)
      </a>
    );
  }
  return (
    <div aria-live="polite" className="flex flex-col items-center gap-2">
      {status === "pending" ? (
        <>
          <Button size="lg" disabled loading>
            Préparation…
          </Button>
          <Loader label="Ton PDF se prépare : cela peut prendre quelques minutes." />
        </>
      ) : (
        <p role="alert" className="m-0 text-sm font-bold text-error-700">
          La création du PDF a échoué. L&apos;équipe Steamy est prévenue : réessaie plus tard.
        </p>
      )}
    </div>
  );
}
