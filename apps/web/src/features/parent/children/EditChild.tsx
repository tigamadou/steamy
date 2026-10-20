import { Breadcrumb, SkeletonBlock } from "@/components/ds";
import { routes } from "@/lib/routes";

import { getChild } from "./api";
import { ChildForm } from "./ChildForm";
import { fullName } from "./ChildRow";

/** WPD10 · Modifier le profil : enfant lu côté serveur (celui d'un autre parent → « introuvable »), puis le formulaire. */
export async function EditChild({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const child = await getChild(id);
  if (!child) return null;
  return (
    <div className="mx-auto flex w-full max-w-160 flex-col gap-4">
      <Breadcrumb
        items={[
          { label: "Mes enfants", href: routes.parent.children },
          { label: fullName(child), href: routes.parent.child(child.id) },
          { label: "Modifier" },
        ]}
      />
      <h2 className="sr-only">Profil de {fullName(child)}</h2>
      <ChildForm child={child} />
    </div>
  );
}

/** Squelette de WPD10. */
export function EditChildSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement du profil de votre enfant…"
      className="mx-auto flex w-full max-w-160 flex-col gap-4"
    >
      <SkeletonBlock className="h-4 w-56 rounded-sm" />
      <SkeletonBlock className="h-140 rounded-[22px]" />
    </div>
  );
}
