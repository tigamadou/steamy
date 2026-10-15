import type { Schemas } from "@steamy/api-client";
import type { CSSProperties, ReactNode } from "react";

import { Accordion, Badge, Breadcrumb, Button, Icon, SkeletonBlock } from "@/components/ds";
import { catalogHref } from "@/lib/catalog-filters";
import { DIFFICULTY_LABELS, formatPrice } from "@/lib/format";
import { routes } from "@/lib/routes";

import { WLJoinBanner } from "./sections";

// Fiche parcours publique WL22 (design/screens-public-a-concevoir-web.jsx) : plan sans contenu de mission (D11).

type Course = Schemas["CourseDetail"];
type Offer = "free" | "paid" | "kit";

/** Gratuit, payant, ou obtenu avec le Kit Code du kit requis (D36). */
export function offerOf(course: Course): Offer {
  if (course.requiredKit) {
    return "kit";
  }
  return course.isFree ? "free" : "paid";
}

/** Liste de chaînes d'un champ JSON de l'API (`outcomes`, `prerequisites`) ; autre forme ignorée. */
export function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function counts(course: Course) {
  const levels = course.projects.reduce((n, project) => n + project.levels.length, 0);
  return { projects: course.projects.length, levels, missions: course.missionCount };
}

const PLURALS: Record<string, string> = { projet: "projets", niveau: "niveaux", mission: "missions" };

function plural(n: number, word: keyof typeof PLURALS) {
  return `${n} ${n > 1 ? PLURALS[word] : word}`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-3 text-xl font-black text-ink-900">{title}</h2>
      {children}
    </section>
  );
}

/** En-tête : catégorie, titre, difficulté, durée, certification, kit, prix. */
export function CourseHero({ course }: { course: Course }) {
  const offer = offerOf(course);
  return (
    <div
      className="relative flex flex-col gap-6 overflow-hidden rounded-[24px] bg-(--course) p-7 text-white sm:flex-row sm:items-center"
      style={{ "--course": course.category.color } as CSSProperties}
    >
      {/* Voile sombre : texte blanc lisible (AA) quelle que soit la couleur de la catégorie */}
      <span aria-hidden className="absolute inset-0 bg-ink-900/45" />
      <div className="relative flex min-w-0 flex-1 flex-col gap-2.5">
        <p className="self-start rounded-pill bg-ink-900/30 px-3 py-1 text-xs font-black tracking-[0.04em] uppercase">
          {course.category.label}
        </p>
        <h1 className="text-[28px] leading-tight font-black sm:text-[34px]">{course.title}</h1>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-extrabold">
          <li className="inline-flex items-center gap-1.5">
            <Icon name="trophy" size={14} /> {DIFFICULTY_LABELS[course.difficulty]}
          </li>
          {!!course.durationHours && <li>⏱ {course.durationHours} h environ</li>}
          {course.certificateEnabled && <li>📜 Certification à la clé</li>}
          {offer === "kit" && <li>📦 Kit requis</li>}
        </ul>
        <div>
          {offer === "kit" ? (
            <Badge tone="amber">📦 Avec le Kit Code</Badge>
          ) : offer === "free" ? (
            <Badge tone="success">Gratuit</Badge>
          ) : (
            <Badge tone="amber">{formatPrice(course.price ?? 0)}</Badge>
          )}
        </div>
      </div>
      <span
        aria-hidden
        className="relative flex h-37 w-full shrink-0 items-center justify-center rounded-[18px] bg-white/20 text-[64px] sm:w-55"
      >
        {course.emoji || course.category.icon}
      </span>
    </div>
  );
}

/** Plan : projets (volets repliables) › niveaux › titres des missions, sans aucun contenu (D11). */
export function CoursePlan({ course }: { course: Course }) {
  const total = counts(course);
  return (
    <Section
      title={`Plan du parcours · ${plural(total.projects, "projet")}, ${plural(total.levels, "niveau")}, ${plural(total.missions, "mission")}`}
    >
      <div className="flex flex-col gap-2.5">
        {course.projects.map((project, index) => {
          const missions = project.levels.reduce((n, level) => n + level.missions.length, 0);
          return (
            <Accordion
              key={`${project.order}-${project.title}`}
              defaultOpen={index === 0}
              title={
                <span className="flex flex-1 flex-col">
                  <span className="text-[11px] font-black tracking-[0.06em] text-ink-600 uppercase">
                    Projet {index + 1}
                  </span>
                  <span className="text-[15px] font-black">{project.title}</span>
                  <span className="text-[13px] font-bold text-ink-600">
                    {plural(project.levels.length, "niveau")} · {plural(missions, "mission")}
                  </span>
                </span>
              }
            >
              <div className="flex flex-col gap-3">
                {project.levels.map((level, levelIndex) => (
                  <div key={`${level.order}-${level.title}`}>
                    <h3 className="mb-1.5 text-[13px] font-black text-primary-700">
                      Niveau {levelIndex + 1} · {level.title}
                    </h3>
                    <ul>
                      {level.missions.map((mission) => (
                        <li
                          key={`${mission.order}-${mission.title}`}
                          className="flex items-center gap-2.5 py-1.5 text-sm font-bold text-ink-700"
                        >
                          <Icon name="lock" size={14} className="text-ink-600" />
                          {mission.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <p className="text-xs font-bold text-ink-600">
                  Chaque niveau se termine par un quiz, chaque projet par une évaluation finale.
                </p>
              </div>
            </Accordion>
          );
        })}
      </div>
      <p className="mt-3 text-[13px] font-bold text-ink-600">
        🔒 Le contenu des missions (vidéos, activités, quiz) est accessible après inscription.
      </p>
    </Section>
  );
}

/** Encart d'inscription du visiteur : retour sur la fiche après inscription ou connexion (`?next=`). */
export function EnrollCard({ course }: { course: Course }) {
  const offer = offerOf(course);
  const back = routes.course(course.slug);
  const total = counts(course);
  const facts: Array<[string, string]> = [
    ...(course.durationHours ? [["⏱", `${course.durationHours} h de contenu environ`] as [string, string]] : []),
    ["📦", `${plural(total.projects, "projet")} · ${plural(total.levels, "niveau")}`],
    ["🎯", plural(total.missions, "mission")],
    ...(course.requiredKit ? [["🧰", `Kit ${course.requiredKit.name} requis`] as [string, string]] : []),
    ...(course.certificateEnabled ? [["📜", "Certification PDF"] as [string, string]] : []),
  ];
  return (
    <aside
      aria-label="S'inscrire au parcours"
      className="flex flex-col gap-3.5 rounded-[22px] border-2 border-ink-100 bg-surface p-5.5 shadow-pop-md lg:sticky lg:top-24"
    >
      {offer === "free" && (
        <>
          <Badge tone="success" className="self-start">
            Gratuit · accès complet
          </Badge>
          <Button block size="lg" variant="secondary" icon="play" href={routes.signup(back)}>
            Commencer
          </Button>
        </>
      )}
      {offer === "paid" && (
        <>
          <div>
            <p className="text-[30px] font-black text-ink-900">{formatPrice(course.price ?? 0)}</p>
            <p className="text-[13px] font-bold text-ink-600">📱 Payé par ton parent en Mobile Money · accès à vie</p>
          </div>
          <Button block size="lg" icon="user" href={routes.signup(back)}>
            Demander à mon parent
          </Button>
        </>
      )}
      {offer === "kit" && (
        <>
          <p className="flex gap-2.5 rounded-[14px] border-2 border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-normal font-bold text-ink-700">
            <span aria-hidden>📦</span>
            <span>
              Ce parcours s&apos;obtient avec le <strong>Kit Code</strong> fourni avec le kit{" "}
              <strong>{course.requiredKit!.name}</strong>. Pas de paiement séparé.
            </span>
          </p>
          <Button block size="lg" href={routes.signup(back)}>
            Créer mon compte
          </Button>
        </>
      )}
      <Button block variant="ghost" href={routes.login(back)}>
        {offer === "kit" ? "J'ai déjà un Kit Code · Se connecter" : "J'ai déjà un compte · Se connecter"}
      </Button>
      <hr className="border-t-2 border-ink-100" />
      <p className="text-xs font-black tracking-[0.06em] text-ink-600 uppercase">Inclus dans le parcours</p>
      <ul className="flex flex-col gap-2">
        {facts.map(([icon, label]) => (
          <li key={label} className="flex items-center gap-2.5 text-sm font-bold text-ink-700">
            <span aria-hidden className="w-5 text-center">
              {icon}
            </span>
            {label}
          </li>
        ))}
      </ul>
      <p className="text-xs leading-normal font-bold text-ink-600">
        Un compte est nécessaire : ton parent valide ton inscription en 1 min.
      </p>
    </aside>
  );
}

/** WL22 complète : fil d'Ariane, en-tête, présentation, objectifs, plan, certification, public, encart. */
export function CourseDetail({ course }: { course: Course }) {
  const outcomes = stringList(course.outcomes);
  const prerequisites = stringList(course.prerequisites);
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pt-7 pb-14 sm:px-8">
      <Breadcrumb
        className="mb-4"
        items={[
          { label: "Parcours", href: routes.courses },
          { label: course.category.label, href: catalogHref({ category: course.category.slug }) },
          { label: course.title },
        ]}
      />
      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <CourseHero course={course} />
          <Section title="À propos du parcours">
            <p className="text-[15px] leading-relaxed font-semibold text-ink-700">{course.description}</p>
          </Section>
          {outcomes.length > 0 && (
            <Section title="Ce que tu vas apprendre">
              <ul className="grid gap-2 sm:grid-cols-2">
                {outcomes.map((outcome) => (
                  <li key={outcome} className="flex items-start gap-2 text-sm font-bold text-ink-700">
                    <Icon name="check" size={16} strokeWidth={3} className="mt-0.5 text-success-700" />
                    {outcome}
                  </li>
                ))}
              </ul>
            </Section>
          )}
          <CoursePlan course={course} />
          {course.certificateEnabled && (
            <Section title="Certification délivrée">
              <div className="flex items-center gap-4 rounded-[18px] border-2 border-amber-200 bg-amber-50 p-4.5">
                <span aria-hidden className="text-5xl">
                  📜
                </span>
                <div>
                  <p className="text-base font-black text-ink-900">Certification Steamy</p>
                  <p className="text-sm leading-normal font-semibold text-ink-700">
                    Délivrée en PDF quand toutes les missions et toutes les évaluations finales sont réussies. Elle
                    s&apos;accompagne d&apos;un ticket offert pour un Steamy Event.
                  </p>
                </div>
              </div>
            </Section>
          )}
          {(course.audience || prerequisites.length > 0) && (
            <Section title="Pour qui ?">
              {course.audience && <p className="text-[15px] font-semibold text-ink-700">{course.audience}</p>}
              {prerequisites.length > 0 && (
                <p className="mt-1.5 text-[15px] font-semibold text-ink-700">Prérequis : {prerequisites.join(" ; ")}</p>
              )}
            </Section>
          )}
        </div>
        <EnrollCard course={course} />
      </div>
      <WLJoinBanner />
    </div>
  );
}

/** Chargement de WL22 : silhouette de la fiche (skeleton structurel). */
export function CourseDetailSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement du parcours…"
      className="mx-auto w-full max-w-[1120px] px-4 pt-7 pb-14 sm:px-8"
    >
      <SkeletonBlock className="mb-4 h-3.5 w-64" />
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          <SkeletonBlock className="h-52 rounded-[24px]" />
          <SkeletonBlock className="h-5.5 w-56" />
          <SkeletonBlock className="h-3.5" />
          <SkeletonBlock className="h-3.5 w-4/5" />
          <SkeletonBlock className="h-16 rounded-[18px]" />
          <SkeletonBlock className="h-16 rounded-[18px]" />
        </div>
        <SkeletonBlock className="h-105 rounded-[22px]" />
      </div>
    </div>
  );
}
