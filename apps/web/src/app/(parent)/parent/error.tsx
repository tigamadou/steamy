"use client";

import { useRouter } from "next/navigation";

import { ErrorState } from "@/components/states";

/** WX02 de l'espace parent, dans le shell (la navigation reste disponible), au vouvoiement. */
export default function ParentError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const router = useRouter();
  return <ErrorState register="vous" headingLevel={2} onRetry={retry} onBack={() => router.back()} />;
}
