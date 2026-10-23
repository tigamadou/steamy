import type { Schemas } from "@steamy/api-client";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { eventPlace, PriceBadge } from "@/components/public/events";
import { formatFullDate } from "@/lib/dates";

/**
 * Carte d'un événement à venir dans un shell d'espace (WPD06, WT09) : visuel, titre vers la fiche WL23 de l'espace,
 * date, lieu et prix du serveur ; `action` est le bouton propre à l'espace (« Inscrire un enfant »…).
 */
export function EventTile({
  event,
  href,
  action,
}: {
  event: Schemas["SteamyEvent"];
  href: string;
  action: ReactNode;
}) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[18px] border-[1.5px] border-ink-100 bg-surface">
      <span
        aria-hidden
        className="flex h-24 items-center justify-center bg-(--event) text-[44px]"
        style={{ "--event": event.color } as CSSProperties}
      >
        {event.emoji || "🎟️"}
      </span>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="m-0 text-[15px] font-black">
          <Link
            href={href}
            className="rounded-sm text-ink-900 hover:text-primary-700 hover:underline focus-visible:outline-3 focus-visible:outline-primary-500"
          >
            {event.title}
          </Link>
        </h3>
        <p className="m-0 text-[13px] font-bold text-ink-600">
          📅 {formatFullDate(event.startsAt)} · 📍 {eventPlace(event)}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1.5">
          <PriceBadge event={event} />
          {action}
        </div>
      </div>
    </article>
  );
}
