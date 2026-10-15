"use client";

import { usePathname, useRouter } from "next/navigation";

import { ErrorState, registerOf } from "@/components/states";

/** WX02 de dernier recours (hors des espaces qui ont leur propre `error.tsx`) : registre déduit de l'URL. */
export default function RootError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const router = useRouter();
  return <ErrorState register={registerOf(usePathname())} onRetry={retry} onBack={() => router.back()} />;
}
