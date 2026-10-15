"use client";

import { ErrorState } from "@/components/states";

import { nunito } from "./fonts";
import "./globals.css";

/**
 * WX02 quand le layout racine lui-même échoue : remplace tout le document, d'où `<html>`, la police et les
 * styles. Pas de `metadata` possible ici (composant client) : titre par `<title>`.
 */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="fr" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <title>Erreur · Steamy</title>
        <ErrorState onRetry={retry} />
      </body>
    </html>
  );
}
