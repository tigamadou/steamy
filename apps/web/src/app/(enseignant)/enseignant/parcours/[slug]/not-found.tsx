import { NotFoundState } from "@/components/states";
import { routes } from "@/lib/routes";

/** WT10 · parcours ou mission inexistant ou non encadré par l'enseignant : « introuvable », sans distinguer « interdit » (D64). */
export default function CourseNotFound() {
  return (
    <NotFoundState
      register="vous"
      headingLevel={2}
      title="Ce contenu est introuvable"
      body="Ce parcours ou cette mission n'existe pas ou n'est pas encadré dans vos classes. Retrouvez vos parcours dans votre espace."
      action={{ label: "Voir mes parcours", href: routes.teacher.courses }}
    />
  );
}
