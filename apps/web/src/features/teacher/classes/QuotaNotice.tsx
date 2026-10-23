import type { Schemas } from "@steamy/api-client";

import { ProgressBar } from "@/components/ds";
import { formatDate } from "@/lib/dates";

type School = Schemas["School"];

/** Création impossible : quota de classes atteint ou offre échue (le serveur décide, ceci n'est qu'une indication). */
export function creationBlocked(school: School): boolean {
  return school.offerExpired || school.classroomsLeft <= 0;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count > 1 ? many : one}`;
}

/**
 * Rappel du quota de l'école (D61, C19) : classes et élèves utilisés et restants, tels que le serveur les compte
 * (les invitations en attente comptent). Une indication : le serveur refuse tout dépassement.
 */
export function QuotaNotice({ school }: { school: School }) {
  const classesFull = school.classroomsLeft <= 0;
  const learnersFull = school.learnersLeft <= 0;
  return (
    <aside
      aria-label="Quota de l'offre"
      className={`flex flex-col gap-3.5 rounded-[20px] border-2 bg-surface p-4.5 ${
        school.offerExpired || classesFull ? "border-error-100" : "border-ink-100"
      }`}
    >
      <div>
        <p className="m-0 text-xs font-black tracking-[.06em] text-ink-600 uppercase">Offre de l&apos;établissement</p>
        <p className="m-0 mt-0.5 text-base font-black text-ink-900">{school.offer}</p>
        {school.validUntil && (
          <p className="m-0 text-xs font-bold text-ink-600">
            {school.offerExpired ? "Échue depuis le" : "Valable jusqu'au"} {formatDate(school.validUntil)}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="m-0 flex justify-between text-[13px] font-extrabold text-ink-700">
          <span>Classes</span>
          <span className={classesFull ? "text-error-600" : "text-ink-600"}>
            {school.classroomsUsed} / {school.classroomQuota}
          </span>
        </p>
        <ProgressBar
          value={school.classroomQuota ? (100 * school.classroomsUsed) / school.classroomQuota : 100}
          label="Classes utilisées"
          tone={classesFull ? "amber" : "success"}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="m-0 flex justify-between text-[13px] font-extrabold text-ink-700">
          <span>Élèves</span>
          <span className={learnersFull ? "text-error-600" : "text-ink-600"}>
            {school.learnersUsed} / {school.learnerQuota}
          </span>
        </p>
        <ProgressBar
          value={school.learnerQuota ? (100 * school.learnersUsed) / school.learnerQuota : 100}
          label="Élèves utilisés"
          tone={learnersFull ? "amber" : "success"}
        />
      </div>
      <p className="m-0 text-xs leading-normal font-bold text-ink-600">
        {school.offerExpired
          ? "L'offre de l'établissement est échue : la création de classes et l'ajout d'élèves sont bloqués. Contactez la direction de votre établissement."
          : classesFull
            ? "Le quota de classes de l'offre est atteint. Pour l'augmenter, contactez la direction de votre établissement."
            : `Il reste ${plural(school.classroomsLeft, "classe", "classes")} et ${plural(school.learnersLeft, "place d'élève", "places d'élèves")}, invitations en attente comprises. Les élèves ne paient pas : l'accès au parcours est couvert par l'offre.`}
      </p>
    </aside>
  );
}
