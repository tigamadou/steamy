import type { Metadata } from "next";

import { NotFoundState } from "@/components/states";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Parcours introuvable" };

/** WL22 · 404 : parcours inexistant ou non publié. */
export default function CourseNotFound() {
  return (
    <NotFoundState
      title="Ce parcours est introuvable"
      body="Il n'existe pas ou n'est plus publié. Plein d'autres parcours t'attendent dans le catalogue."
      action={{ label: "Voir tous les parcours", href: routes.courses }}
    />
  );
}
