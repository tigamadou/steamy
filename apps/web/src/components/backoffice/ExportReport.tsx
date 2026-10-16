"use client";

import type { Schemas } from "@steamy/api-client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ds/Button";
import { apiCall, errorMessage } from "@/lib/api-call";
import { cx } from "@/lib/cx";

import { FOCUS } from "./styles";

type Format = Schemas["ReportExport"]["format"];
type Export = Schemas["ReportExport"];

const LABELS: Record<Format, string> = { csv: "CSV", pdf: "PDF" };

/** Intervalle d'interrogation de l'état d'un export, et nombre d'interrogations avant d'abandonner (~2 min). */
export const POLL_MS = 2000;
export const MAX_POLLS = 60;

export type ExportReportProps = {
  /** Trimestre, au format de l'API (`2026-t4`). */
  period: string;
  /** URL publique de l'API : le téléchargement passe par elle (redirection vers une URL présignée). */
  apiUrl: string;
};

type State =
  | { step: "idle" }
  | { step: "pending"; format: Format }
  | { step: "ready"; format: Format; href: string }
  | { step: "error"; message: string };

/**
 * « Exporter CSV » / « Exporter PDF » (WAD04, D74) : l'export est généré en asynchrone ; l'état est interrogé
 * jusqu'à `ready`, puis le lien de téléchargement est proposé et annoncé (pas de notification au personnel).
 */
export function ExportReport({ period, apiUrl }: ExportReportProps) {
  const router = useRouter();
  const [state, setState] = useState<State>({ step: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function fail(result: { code: Schemas["ErrorCodeEnum"]; message: string }) {
    if (result.code === "OTP_REQUIRED") {
      router.refresh();
      setState({ step: "idle" });
      return;
    }
    setState({
      step: "error",
      message:
        result.code === "PERMISSION_DENIED"
          ? "Votre groupe ne peut pas exporter le rapport d'impact."
          : errorMessage(result, "vous"),
    });
  }

  function follow(item: Export, polls: number) {
    if (item.status === "ready" && item.downloadPath) {
      setState({ step: "ready", format: item.format, href: `${apiUrl.replace(/\/+$/, "")}${item.downloadPath}` });
      return;
    }
    if (item.status === "failed" || polls >= MAX_POLLS) {
      setState({ step: "error", message: `L'export ${LABELS[item.format]} n'a pas pu être généré. Réessayez.` });
      return;
    }
    timer.current = setTimeout(async () => {
      const result = await apiCall((api) =>
        api.GET("/api/backoffice/exports/{id}/", { params: { path: { id: item.id } } }),
      );
      if (result.ok) follow(result.data, polls + 1);
      else fail(result);
    }, POLL_MS);
  }

  async function start(format: Format) {
    clearTimeout(timer.current);
    setState({ step: "pending", format });
    const result = await apiCall((api) =>
      api.POST("/api/backoffice/impact-reports/{period}/exports/", {
        params: { path: { period } },
        body: { format },
      }),
    );
    if (result.ok) follow(result.data, 0);
    else fail(result);
  }

  const pending = state.step === "pending";
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {(["csv", "pdf"] as const).map((format) => (
        <Button
          key={format}
          variant="ink-outline"
          size="sm"
          disabled={pending}
          loading={pending && state.format === format}
          onClick={() => void start(format)}
        >
          Exporter {LABELS[format]}
        </Button>
      ))}
      <p role="status" className="m-0 basis-full text-sm font-bold text-ink-800 empty:hidden">
        {pending && `Préparation de l'export ${LABELS[state.format]}… Vous pouvez rester sur cette page.`}
        {state.step === "ready" && (
          <>
            Export {LABELS[state.format]} prêt :{" "}
            <a href={state.href} className={cx("rounded-sm underline", FOCUS)}>
              Télécharger le {LABELS[state.format]}
            </a>
          </>
        )}
      </p>
      <p role="alert" className="m-0 basis-full text-sm font-bold text-error-700 empty:hidden">
        {state.step === "error" && state.message}
      </p>
    </div>
  );
}
