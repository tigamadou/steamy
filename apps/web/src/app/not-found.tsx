import type { Metadata } from "next";

import { PublicShell } from "@/components/public";
import { NotFoundState } from "@/components/states";

export const metadata: Metadata = {
  title: "Page introuvable",
};

/** 404 d'une URL sans route (dont les écrans reportés), dans le shell public ; `(public)/not-found.tsx` sert `notFound()`. */
export default function NotFound() {
  return (
    <PublicShell>
      <NotFoundState />
    </PublicShell>
  );
}
