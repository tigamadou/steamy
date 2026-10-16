"use client";

import { useRouter } from "next/navigation";

import { ErrorState } from "@/components/states";

/** WX02 de l'espace apprenant, dans le shell (la navigation reste disponible), au tutoiement. */
export default function LearnerError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const router = useRouter();
  return <ErrorState register="tu" headingLevel={2} onRetry={retry} onBack={() => router.back()} />;
}
