import type { Metadata } from "next";

import { Breadcrumb } from "@/components/ds";
import { ChildForm } from "@/features/parent/children/ChildForm";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Ajouter un enfant" };

/** WPD04 · Ajouter un enfant : le parent crée le compte (aucun consentement, il en est l'auteur, D51). */
export default function AddChildPage() {
  return (
    <div className="mx-auto flex w-full max-w-140 flex-col gap-4">
      <Breadcrumb items={[{ label: "Mes enfants", href: routes.parent.children }, { label: "Ajouter un enfant" }]} />
      <ChildForm />
    </div>
  );
}
