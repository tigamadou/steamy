import type { Schemas } from "@steamy/api-client";

import { Breadcrumb } from "@/components/ds/Breadcrumb";
import { Button } from "@/components/ds/Button";
import { CourseCard } from "@/components/ds/CourseCard";
import { MissionItem } from "@/components/ds/MissionItem";
import { SectionHeader } from "@/components/ds/SectionHeader";
import { getServerApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { features } from "@/lib/features";
import { DIFFICULTY_LABELS, formatPrice } from "@/lib/format";
import { routes } from "@/lib/routes";

import { certificateDownloadUrl, readContent } from "../content";
import { formatHours, position } from "../format";
import { LockedContentState } from "../LockedContentState";
import { nextStepHref } from "../next-step";
import { CertificateDownload } from "./CertificateDownload";

const MONTH = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "Africa/Porto-Novo" });

function plural(count: number, one: string, many: string): string {
  return `${count} ${count > 1 ? many : one}`;
}

/** « Il te reste 2 projets » ou, dans le dernier projet, « Il te reste 3 missions » (WJ09). */
export function remainingLabel(tree: Schemas["Tree"]): string {
  const projects = tree.projects.filter((project) => project.state !== "done").length;
  if (projects > 1) return plural(projects, "projet", "projets");
  const missions = tree.certification.missionCount - tree.certification.missionsDone;
  return missions > 0 ? plural(missions, "mission", "missions") : plural(projects, "projet", "projets");
}

function Recommendations({ items }: { items: Schemas["Recommendation"][] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="continue-ton-aventure" className="flex flex-col gap-3">
      <SectionHeader
        id="continue-ton-aventure"
        title="Continue ton aventure"
        action={{ label: "Voir tout", href: routes.learner.catalog }}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((course) => (
          <CourseCard
            key={course.slug}
            course={{
              href: routes.learner.catalogCourse(course.slug),
              title: course.title,
              difficulty: DIFFICULTY_LABELS[course.difficulty],
              isFree: course.isFree ?? false,
              priceLabel: formatPrice(course.price ?? 0),
              color: course.category.color,
              emoji: course.emoji || course.category.icon,
            }}
          />
        ))}
      </div>
    </section>
  );
}

// WJ07 (certification obtenue) / WJ09 (parcours incomplet) · L'API dit si les conditions D33 sont remplies.
export async function CertificationView({ slug }: { slug: string }) {
  const api = await getServerApi();
  const [treeResult, me, badges, recommendations] = await Promise.all([
    api.GET("/api/learning/enrollments/{course_slug}/tree/", { params: { path: { course_slug: slug } } }),
    getCurrentUser(),
    api.GET("/api/learning/badges/", { params: { query: { course: slug, pageSize: 100 } } }),
    api.GET("/api/learning/recommendations/", { params: { query: { limit: 3 } } }),
  ]);
  const content = readContent(treeResult);
  if (!content.ok) return <LockedContentState code={content.code} courseSlug={slug} />;
  const tree = content.data;
  const { certification, course } = tree;
  const crumbs = (
    <Breadcrumb
      items={[
        { label: "Mes parcours", href: routes.learner.courses },
        { label: course.title, href: routes.learner.course(course.slug) },
        { label: "Certification" },
      ]}
    />
  );

  if (!certification.certificateEnabled) {
    return (
      <div className="flex flex-col gap-5">
        {crumbs}
        <p className="m-0 rounded-lg bg-ink-50 p-4 text-sm font-bold text-ink-600">
          Ce parcours ne délivre pas de certification.
        </p>
      </div>
    );
  }

  const certificate = certification.certificate;
  if (!certification.eligible || !certificate) {
    return (
      <div className="flex flex-col gap-5">
        {crumbs}
        <section aria-labelledby="presque" className="flex flex-col gap-2 rounded-[22px] border-2 border-amber-300 bg-amber-50 p-5">
          <h2 id="presque" className="m-0 text-2xl font-black text-ink-900">
            Encore un effort !
          </h2>
          <p className="m-0 text-[15px] font-semibold text-ink-700">
            Il te reste {remainingLabel(tree)} pour obtenir ta certification : toutes les missions et toutes les
            évaluations des projets doivent être réussies.
          </p>
          <p className="m-0 text-sm font-bold text-ink-600">
            {certification.missionsDone}/{certification.missionCount} missions · {certification.summativesPassed}/
            {certification.summativeCount} évaluations réussies
          </p>
        </section>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {tree.projects.map((project) => (
            <li key={project.id}>
              <MissionItem
                step={`Projet ${position(project)}`}
                title={project.title}
                duration={formatHours(project.durationHours)}
                icon="🧩"
                state={project.id === tree.next.projectId && project.state === "available" ? "current" : project.state}
                href={routes.learner.course(course.slug)}
              />
            </li>
          ))}
        </ul>
        {tree.next.type !== "certification" && (
          <Button href={nextStepHref(tree.next)} size="lg" icon="play" className="self-start">
            {tree.currentProject ? `Continuer le projet ${position(tree.currentProject)}` : "Continuer mon parcours"}
          </Button>
        )}
      </div>
    );
  }

  const projectBadges = (badges.data?.results ?? []).filter((badge) => badge.kind === "project");
  return (
    <div className="flex flex-col gap-6">
      {crumbs}
      <section
        aria-labelledby="certificat"
        className="flex flex-col items-center gap-3 rounded-[28px] border-3 border-amber-400 bg-surface px-6 py-8 text-center shadow-pop-md"
      >
        <p className="m-0 text-xs font-extrabold tracking-[.12em] text-amber-700 uppercase">Certification Steamy</p>
        <h2 id="certificat" className="m-0 text-3xl leading-tight font-black text-ink-900">
          {course.title}
        </h2>
        <p className="m-0 text-[15px] font-semibold text-ink-600">
          {me && (
            <>
              <strong className="text-ink-900">
                {me.firstName} {me.lastName}
              </strong>{" "}
              ·{" "}
            </>
          )}
          {MONTH.format(new Date(certificate.issuedAt))} · n° {certificate.number}
        </p>
        {projectBadges.length > 0 && (
          <ul aria-label="Badges de projet" className="m-0 flex list-none flex-wrap justify-center gap-2 p-0">
            {projectBadges.map((badge) => (
              <li key={badge.id} className="rounded-pill bg-primary-50 px-3 py-1 text-sm font-bold text-primary-700">
                <span aria-hidden>{badge.icon} </span>
                {badge.label}
              </li>
            ))}
          </ul>
        )}
        <CertificateDownload
          certificateId={certificate.id}
          status={certificate.pdfStatus}
          downloadUrl={certificateDownloadUrl(certificate.id)}
        />
      </section>
      {features.events && certification.eventTicket && (
        <section aria-labelledby="ticket" className="flex flex-col items-start gap-2 rounded-[22px] bg-amber-50 p-5">
          <h3 id="ticket" className="m-0 text-lg font-black text-ink-900">
            Ticket Steamy Events offert !
          </h3>
          <p className="m-0 text-sm font-semibold text-ink-700">
            Ta candidature à un prochain événement sera gratuite (l&apos;accord de ton parent reste demandé).
          </p>
          <Button href={routes.learner.events} variant="amber">
            Voir les événements
          </Button>
        </section>
      )}
      <Recommendations items={recommendations.data ?? []} />
    </div>
  );
}
