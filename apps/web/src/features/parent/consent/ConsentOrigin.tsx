import type { Schemas } from "@steamy/api-client";

import { formatInstant } from "@/lib/dates";

type Origin = Schemas["OriginEnum"];

/** Texte de l'origine d'une demande ; l'origine enseignant (D60) arrive avec l'étape 4.10. */
const ORIGIN_TEXT: Partial<Record<Origin, (firstName: string, date: string) => { title: string; text: string }>> = {
  learner: (firstName, date) => ({
    title: `Demande envoyée par ${firstName}`,
    text: `${firstName} vous l'a envoyée le ${date} en créant son compte Steamy : son inscription attend votre accord.`,
  }),
  support: (firstName, date) => ({
    title: "Changement de parent transmis par l'équipe Steamy",
    text: `Envoyée le ${date} : en acceptant, vous devenez le parent rattaché au compte de ${firstName}.`,
  }),
  parent: (firstName, date) => ({
    title: "Compte créé depuis votre espace",
    text: `Vous avez ajouté ${firstName} le ${date}.`,
  }),
};

/**
 * Origine de la demande dans WPD05 : l'enfant pendant son inscription (W06), l'équipe Steamy pour un changement de
 * parent (D22) ou le parent lui-même (WPD04). Rien d'autre sur l'enfant que ce que D20 autorise.
 */
export function ConsentOrigin({ request }: { request: Pick<Schemas["ConsentRequest"], "origin" | "firstName" | "createdAt"> }) {
  const origin = ORIGIN_TEXT[request.origin];
  if (!origin) return null;
  const { title, text } = origin(request.firstName, formatInstant(request.createdAt));
  return (
    <div className="flex flex-col gap-1 rounded-[16px] border-2 border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-ink-700">
      <p className="m-0 font-black text-ink-900">{title}</p>
      <p className="m-0">{text}</p>
    </div>
  );
}
