import type { Metadata } from "next";

import { PublicShell } from "@/components/public";
import { NotFoundState } from "@/components/states";

export const metadata: Metadata = {
  title: "Page introuvable",
};

/** 404 : URL inconnue (dont les écrans reportés, sans route) ou contenu non publié, dans le shell public. */
export default function NotFound() {
  return (
    <PublicShell>
      <NotFoundState />
    </PublicShell>
  );
}
