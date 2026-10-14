"use client";

import { useEffect, useState } from "react";

import { getBrowserApi } from "@/lib/api-browser";

type Status = "pending" | "ok" | "error";

const MESSAGES: Record<Status, { text: string; className: string }> = {
  pending: { text: "Navigateur → API…", className: "text-ink-500" },
  ok: { text: "✅ Le navigateur joint l'API", className: "text-success-700" },
  error: { text: "❌ Le navigateur ne joint pas l'API", className: "text-error-700" },
};

export function BrowserApiStatus() {
  const [status, setStatus] = useState<Status>("pending");

  useEffect(() => {
    getBrowserApi()
      .then((api) => api.GET("/api/health/"))
      .then(({ response }) => setStatus(response.ok ? "ok" : "error"))
      .catch(() => setStatus("error"));
  }, []);

  const { text, className } = MESSAGES[status];
  return <p className={className}>{text}</p>;
}
