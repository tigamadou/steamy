"use client";

import type { Schemas } from "@steamy/api-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge, Button, KitMiniCard, ProgressBar } from "@/components/ds";
import { offerOf, plural, stringList } from "@/components/public/course-detail";
import { formatPriceHt } from "@/lib/format";
import { routes } from "@/lib/routes";
import { createPaymentRequest } from "@/features/unlock/api";

import { enroll, failureMessage } from "./api";
import { useWishlist } from "./use-wishlist";

export type EnrollCardProps = {
  course: Schemas["CourseDetail"];
  /** Progression (API) si l'apprenant est inscrit, sinon absent. */
  progress?: number;
  wished: boolean;
  /** Kit requis lu dans la boutique (nom, prix, disponibilité), `null` s'il n'est plus en vente. */
  kit: Schemas["KitDetail"] | null;
  /** Demande au parent encore en attente pour ce parcours (WA02), sinon absent. */
  pendingRequestId?: number;
};

/**
 * Carte d'inscription de WC04/WC05, `sticky` dans sa colonne. Parcours gratuit : « Commencer le parcours » crée
 * l'inscription puis ouvre WJ01 du premier projet ; déjà inscrit : « Continuer » → WC06a. Parcours avec kit : pas de
 * prix de parcours (D36), « J'ai un Kit Code » → WA01. Parcours payant : « Demander à mon parent » crée la demande puis
 * ouvre WA02 ; une demande déjà en cours devient « Demande envoyée » → WA02. Aucun prix calculé ici (D37).
 */
export function EnrollCard({ course, progress, wished, kit, pendingRequestId }: EnrollCardProps) {
  const router = useRouter();
  const offer = offerOf(course);
  const enrolled = progress !== undefined;
  const wishlist = useWishlist(wished ? [course.slug] : []);
  const isWished = wishlist.wished.has(course.slug);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setPending(true);
    setError(null);
    const result = await enroll(course.slug);
    if (!result.ok) {
      setError(failureMessage(result));
      setPending(false);
      return;
    }
    const project = result.data.currentProject;
    router.push(project ? routes.learner.project(course.slug, project.id) : routes.learner.course(course.slug));
  };

  const askParent = async () => {
    setPending(true);
    setError(null);
    const result = await createPaymentRequest({ kind: "course", courseSlug: course.slug });
    if (!result.ok) {
      setError(result.fields.courseSlug || failureMessage(result));
      setPending(false);
      return;
    }
    router.push(routes.learner.request(result.data.id));
  };

  const levels = course.projects.reduce((n, project) => n + project.levels.length, 0);
  const facts: Array<[string, string]> = [
    ...(course.durationHours ? [["⏱", `${course.durationHours} h de contenu`] as [string, string]] : []),
    ["📦", `${plural(course.projects.length, "projet")} · ${plural(levels, "niveau")}`],
    ["🎯", plural(course.missionCount, "mission")],
    ...(course.certificateEnabled ? [["📜", "Certificat à la fin"] as [string, string]] : []),
  ];
  const prerequisites = stringList(course.prerequisites);

  return (
    <aside
      aria-label="Inscription au parcours"
      className="flex flex-col gap-3 rounded-[22px] border-[1.5px] border-ink-100 bg-surface p-5 shadow-card lg:sticky lg:top-6"
    >
      {enrolled ? (
        <>
          <Badge tone="primary" className="self-start">
            Tu suis ce parcours
          </Badge>
          <ProgressBar value={progress} label="Ta progression" showLabel />
          <Button block size="lg" icon="play" href={routes.learner.course(course.slug)}>
            Continuer
          </Button>
        </>
      ) : (
        <>
          {offer === "free" && (
            <>
              <Badge tone="success" className="self-start">
                Gratuit · accès complet
              </Badge>
              <Button block size="lg" variant="secondary" icon="play" loading={pending} onClick={start}>
                Commencer le parcours
              </Button>
            </>
          )}
          {offer === "paid" && (
            <>
              <div>
                <p className="text-[30px] leading-none font-black text-ink-900">{formatPriceHt(course.price ?? 0)}</p>
                <p className="mt-1.5 text-xs font-bold text-ink-600">Payé par ton parent · accès à vie</p>
              </div>
              {pendingRequestId ? (
                <Button block size="lg" variant="outline" icon="check" href={routes.learner.request(pendingRequestId)}>
                  Demande envoyée
                </Button>
              ) : (
                <Button block size="lg" icon="user" loading={pending} onClick={askParent}>
                  Demander à mon parent
                </Button>
              )}
            </>
          )}
          {offer === "kit" && (
            <>
              <p className="flex gap-2.5 rounded-[14px] border-2 border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-normal font-bold text-ink-700">
                <span aria-hidden>📦</span>
                <span>
                  <strong>Débloqué avec le Kit Code</strong> fourni avec le kit {course.requiredKit!.name}. Pas de
                  paiement séparé.
                </span>
              </p>
              <Button block size="lg" icon="gift" href={routes.learner.kitCode(course.slug)}>
                J&apos;ai un Kit Code
              </Button>
            </>
          )}
          {error && (
            <p role="alert" className="text-sm font-bold text-error-700">
              {error}
            </p>
          )}
        </>
      )}
      <Button block variant="ghost" icon="heart" aria-pressed={isWished} onClick={() => wishlist.toggle(course.slug)}>
        {isWished ? "Dans tes souhaits" : "Ajouter aux souhaits"}
      </Button>

      <hr className="border-t border-ink-100" />
      <p className="text-[11px] font-black tracking-[0.06em] text-ink-600 uppercase">Inclus dans le parcours</p>
      <ul className="flex flex-col gap-2">
        {facts.map(([icon, label]) => (
          <li key={label} className="flex items-center gap-2 text-[13px] font-bold text-ink-700">
            <span aria-hidden className="w-5 text-center">
              {icon}
            </span>
            {label}
          </li>
        ))}
      </ul>

      {prerequisites.length > 0 && (
        <>
          <hr className="border-t border-ink-100" />
          <p className="text-[11px] font-black tracking-[0.06em] text-ink-600 uppercase">Prérequis</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[13px] font-semibold text-ink-700 marker:text-primary-500">
            {prerequisites.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}

      {offer === "kit" && kit && (
        <>
          <hr className="border-t border-ink-100" />
          <p className="text-[11px] font-black tracking-[0.06em] text-ink-600 uppercase">Kit requis</p>
          <KitMiniCard
            name={kit.name}
            priceLabel={formatPriceHt(kit.price)}
            available={kit.available}
            emoji={kit.emoji || kit.category.icon}
            href={routes.learner.shopKit(kit.slug)}
          />
        </>
      )}
      {wishlist.toast}
    </aside>
  );
}
