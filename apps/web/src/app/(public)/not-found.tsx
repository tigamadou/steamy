import type { Metadata } from "next";

import { NotFoundState } from "@/components/states";

export const metadata: Metadata = {
  title: "Page introuvable",
};

/** 404 d'un contenu public inconnu (`notFound()`), déjà dans le shell public du layout. */
export default function PublicNotFound() {
  return <NotFoundState />;
}
