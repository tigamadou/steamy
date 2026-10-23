import type { Schemas } from "@steamy/api-client";

import { formatInstant } from "@/lib/dates";

type Origin = Schemas["OriginEnum"];

/** Texte de l'origine d'une demande ; l'invitation d'un enseignant (D60) a son propre encart, avec la classe. */
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

/** Invitation d'un enseignant (D60) : enseignant, classe, établissement et parcours, couverts par l'école (D62). */
function TeacherOrigin({
  classroom,
  firstName,
  date,
}: {
  classroom: NonNullable<Schemas["ConsentRequest"]["classroom"]>;
  firstName: string;
  date: string;
}) {
  const rows: [string, string][] = [
    ["Enseignant", classroom.teacherName],
    ["Classe", classroom.name],
    ["Établissement", classroom.schoolName],
    ["Parcours", classroom.courseTitle],
  ];
  return (
    <div className="flex flex-col gap-2 rounded-[16px] border-2 border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-ink-700">
      <p className="m-0 font-black text-ink-900">Invitation de {classroom.teacherName}</p>
      <p className="m-0">
        Envoyée le {date} : {firstName} est invité·e à rejoindre une classe sur Steamy. Le parcours est couvert par
        l&apos;établissement, sans paiement.
      </p>
      <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="font-bold text-ink-600">{label}</dt>
            <dd className="m-0 font-black text-ink-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Origine de la demande dans WPD05 : l'enfant pendant son inscription (W06), l'équipe Steamy pour un changement de
 * parent (D22), le parent lui-même (WPD04) ou un enseignant qui invite l'enfant dans sa classe (D60). Rien d'autre sur
 * l'enfant que ce que D20 autorise.
 */
export function ConsentOrigin({
  request,
}: {
  request: Pick<Schemas["ConsentRequest"], "origin" | "firstName" | "createdAt" | "classroom">;
}) {
  if (request.origin === "teacher" && request.classroom) {
    return (
      <TeacherOrigin classroom={request.classroom} firstName={request.firstName} date={formatInstant(request.createdAt)} />
    );
  }
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
