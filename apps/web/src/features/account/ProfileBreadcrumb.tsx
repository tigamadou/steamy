import { Breadcrumb } from "@/components/ds/Breadcrumb";
import { routes } from "@/lib/routes";

/** Fil d'Ariane des sous-écrans du profil (« Profil › … »). */
export function ProfileBreadcrumb({ current }: { current: string }) {
  return <Breadcrumb items={[{ label: "Profil", href: routes.learner.profile }, { label: current }]} />;
}
