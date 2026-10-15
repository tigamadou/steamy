"use client";

import { catchError, type ErrorInfo } from "next/error";

import type { Register } from "./messages";
import { ErrorState } from "./presets";

export type AppStateBoundaryProps = {
  register?: Register;
};

/** Repli d'erreur local (WX02 réduit) : la page et son shell restent affichés, seule la section est remplacée. */
export function AppStateFallback({ register }: AppStateBoundaryProps, { retry }: Pick<ErrorInfo, "retry">) {
  return <ErrorState register={register} onRetry={retry} headingLevel={2} compact />;
}

/**
 * Limite d'erreur d'une section de page (ex. la grille de WL06) : `catchError` de Next 16 laisse passer
 * `notFound()` et `redirect()`, et `retry()` recharge les données de la section.
 */
export const AppStateBoundary = catchError(AppStateFallback);
