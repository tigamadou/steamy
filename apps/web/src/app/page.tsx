import Image from "next/image";
import { Suspense } from "react";

import { BrowserApiStatus } from "@/components/browser-api-status";
import { getServerApi } from "@/lib/api";

const STATUS_MESSAGES = {
  ok: { text: "✅ L'API répond", className: "text-success-700" },
  degraded: { text: "⚠️ L'API répond mais un service est indisponible", className: "text-error-700" },
  unreachable: { text: "❌ Impossible de joindre l'API", className: "text-error-700" },
} as const;

async function fetchApiStatus(): Promise<keyof typeof STATUS_MESSAGES> {
  try {
    const api = await getServerApi();
    const { data, response } = await api.GET("/api/health/");
    return response.ok && data?.status === "ok" ? "ok" : "degraded";
  } catch {
    return "unreachable";
  }
}

async function ApiStatus() {
  const { text, className } = STATUS_MESSAGES[await fetchApiStatus()];
  return <p className={className}>{text}</p>;
}

async function fetchCurrentIdentifier(): Promise<string | undefined> {
  try {
    const api = await getServerApi();
    const { data } = await api.GET("/api/accounts/me/");
    // Identifiant propre au persona : apprenant, parent ou enseignant (ADR 0001)
    return data?.username ?? data?.phone ?? data?.email ?? undefined;
  } catch {
    return undefined;
  }
}

async function SessionStatus() {
  const identifier = await fetchCurrentIdentifier();
  return (
    <p className="text-ink-500">{identifier ? `Connecté : ${identifier}` : "Non connecté"}</p>
  );
}

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <Image src="/steamy_logo.png" alt="Steamy" width={240} height={63} priority />
      <h1 className="text-3xl font-extrabold text-primary-500">Ça démarre ! 🚀</h1>
      <Suspense fallback={<p className="text-ink-500">Vérification de l&apos;API…</p>}>
        <ApiStatus />
      </Suspense>
      <BrowserApiStatus />
      <Suspense>
        <SessionStatus />
      </Suspense>
    </main>
  );
}
