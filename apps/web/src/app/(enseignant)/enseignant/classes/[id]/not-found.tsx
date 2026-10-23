import { NotFoundState } from "@/components/states";
import { routes } from "@/lib/routes";

/** WT04 / WT13 · classe inexistante ou d'un autre enseignant : « introuvable », sans distinguer « interdit » (D64). */
export default function ClassroomNotFound() {
  return (
    <NotFoundState
      register="vous"
      headingLevel={2}
      title="Cette classe est introuvable"
      body="Cette classe n'existe pas ou ne fait pas partie de vos classes. Retrouvez vos classes dans votre espace."
      action={{ label: "Voir mes classes", href: routes.teacher.classes }}
    />
  );
}
