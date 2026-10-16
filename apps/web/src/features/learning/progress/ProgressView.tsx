import type { Schemas } from "@steamy/api-client";

import { ProgressBar } from "@/components/ds/ProgressBar";
import { SectionHeader } from "@/components/ds/SectionHeader";
import { SkeletonBlock } from "@/components/ds/SkeletonBlock";
import { StatPill } from "@/components/ds/StatPill";
import { WeeklyActivityBars, type ActivityDay } from "@/components/ds/WeeklyActivityBars";
import { getServerApi } from "@/lib/api";

import { formatMinutes } from "@/lib/format";
import { Recommendations } from "../Recommendations";

const TZ = "Africa/Porto-Novo";
const WEEKDAY = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: TZ });
const FULL_DAY = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });

/** Secondes → « 1 h 05 » ou « 25 min » (temps lu dans l'API). */
export function formatSeconds(seconds: number): string {
  return formatMinutes(Math.round(seconds / 60));
}

/** Jours de l'API (`lastDays`, du plus ancien à aujourd'hui) → barres de l'histogramme. */
export function toActivityDays(days: Schemas["DaySeconds"][]): ActivityDay[] {
  return days.map((day) => {
    const date = new Date(`${day.date}T12:00:00Z`);
    return { label: WEEKDAY.format(date), fullLabel: FULL_DAY.format(date), seconds: day.seconds, value: formatSeconds(day.seconds) };
  });
}

// WD21 · Ma progression : temps de la semaine, points et rang (masqués si `null`, C8), badges, 7 derniers jours,
// maîtrise par catégorie et recommandations, tous lus dans `learning/progress/` et `learning/recommendations/`.
export async function ProgressView() {
  const api = await getServerApi();
  const [progress, recommendations] = await Promise.all([
    api.GET("/api/learning/progress/"),
    api.GET("/api/learning/recommendations/", { params: { query: { limit: 3 } } }),
  ]);
  if (!progress.data) throw new Error("Progression illisible");
  const { weekSeconds, lastDays, points, rank, streakDays, counters, mastery } = progress.data;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3">
        <StatPill icon="book" label="Cette semaine" value={formatSeconds(weekSeconds)} tone="primary" />
        <StatPill icon="flame" label="Streak" value={`${streakDays} jour${streakDays > 1 ? "s" : ""}`} tone="amber" />
        {points !== null && <StatPill icon="sparkle" label="Points" value={points.toLocaleString("fr-FR")} tone="primary" />}
        {rank !== null && <StatPill icon="rocket" label="Rang" value={rank.label} tone="success" />}
        <StatPill icon="trophy" label="Badges obtenus" value={counters.badges} tone="amber" />
      </div>
      <section aria-labelledby="activite" className="rounded-[20px] border-[1.5px] border-ink-100 bg-surface p-5">
        <SectionHeader id="activite" title="Ton activité des 7 derniers jours" />
        <WeeklyActivityBars days={toActivityDays(lastDays)} caption="Temps d'apprentissage des 7 derniers jours" className="mt-3" />
      </section>
      <section aria-labelledby="maitrise">
        <SectionHeader id="maitrise" title="Maîtrise par catégorie" />
        {mastery.length === 0 ? (
          <p className="m-0 text-sm font-bold text-ink-600">Commence un parcours pour voir ta maîtrise par catégorie.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {mastery.map((item) => (
              <li key={item.category.slug} className="rounded-lg border border-ink-100 bg-surface px-4 py-3">
                <ProgressBar value={item.pct} label={`${item.category.icon} ${item.category.label}`} showLabel tone="success" />
                <p className="m-0 mt-1 text-xs font-bold text-ink-600">
                  {item.missionsDone}/{item.missionCount} missions réussies
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Recommendations id="recommandations" title="Pour aller plus loin" items={recommendations.data ?? []} />
    </div>
  );
}

/** Squelette de WD21. */
export function ProgressSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Chargement de ta progression…" className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <SkeletonBlock className="h-52 rounded-[20px]" />
      <SkeletonBlock className="h-32 rounded-lg" />
    </div>
  );
}
