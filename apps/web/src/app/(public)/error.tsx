"use client";

import { useRouter } from "next/navigation";

import { ErrorState } from "@/components/states";

/** WX02 dans le shell public : la navigation et le pied de page restent affichés. */
export default function PublicError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const router = useRouter();
  return <ErrorState register="tu" onRetry={retry} onBack={() => router.back()} />;
}
