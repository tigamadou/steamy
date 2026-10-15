import type { Metadata } from "next";

import { NotFoundState } from "@/components/states";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Événement introuvable" };

/** WL23 · 404 : événement inexistant ou retiré du calendrier. */
export default function EventNotFound() {
  return (
    <NotFoundState
      title="Cet événement est introuvable"
      body="Il a peut-être été retiré du calendrier. Retrouve tous les prochains rendez-vous Steamy."
      action={{ label: "Voir les événements", href: routes.events }}
    />
  );
}
