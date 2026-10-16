"use client";

import { useRouter } from "next/navigation";

import { ErrorState } from "@/components/states";

/** WX02 du back-office, au registre neutre, dans le shell (la navigation reste disponible). */
export default function BackofficeError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const router = useRouter();
  return <ErrorState register="neutre" tone="ink" onRetry={retry} onBack={() => router.back()} />;
}
