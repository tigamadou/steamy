import { NotFoundState } from "@/components/states";
import { routes } from "@/lib/routes";

/** WT05 · élève inexistant ou hors de mes classes : « introuvable », sans distinguer « interdit » (D64). */
export default function LearnerNotFound() {
  return (
    <NotFoundState
      register="vous"
      headingLevel={2}
      title="Cet élève est introuvable"
      body="Ce profil n'existe pas ou l'élève ne fait pas partie de vos classes. Retrouvez vos élèves dans vos classes."
      action={{ label: "Voir mes classes", href: routes.teacher.classes }}
    />
  );
}
