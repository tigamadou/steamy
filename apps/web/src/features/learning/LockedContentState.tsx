import { Button } from "@/components/ds/Button";
import { Mascot } from "@/components/ds/Mascot";
import { routes } from "@/lib/routes";

import type { LockedCode } from "./content";

const COPY: Record<LockedCode, { body: string; action: string; href: (slug: string) => string }> = {
  CONTENT_LOCKED: {
    body: "Les étapes s'ouvrent une par une : termine d'abord celles qui la précèdent dans ton parcours.",
    action: "Voir mon parcours",
    href: routes.learner.course,
  },
  NOT_ENROLLED: {
    body: "Tu n'es pas encore inscrit à ce parcours. Découvre-le dans le catalogue pour le commencer.",
    action: "Voir le parcours",
    href: routes.learner.catalogCourse,
  },
};

/** Contenu refusé par l'API (`CONTENT_LOCKED`, `NOT_ENROLLED`) : explication et chemin vers ce qui est ouvert. */
export function LockedContentState({ code, courseSlug }: { code: LockedCode; courseSlug: string }) {
  const copy = COPY[code];
  return (
    <section
      aria-labelledby="contenu-verrouille"
      className="mx-auto flex max-w-lg flex-col items-center gap-4 py-10 text-center"
    >
      <Mascot pose="focus" size={130} />
      <h2 id="contenu-verrouille" className="m-0 text-2xl font-black text-ink-900">
        Ce contenu n&apos;est pas encore ouvert
      </h2>
      <p className="m-0 text-[15px] leading-normal font-semibold text-ink-600">{copy.body}</p>
      <Button href={copy.href(courseSlug)} iconRight="arrow-right">
        {copy.action}
      </Button>
    </section>
  );
}
