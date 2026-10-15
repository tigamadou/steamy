import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Mascot } from "@/components/ds";
import { site, SITE_URL } from "@/content/site";
import { getEvent, getUpcomingEvents } from "@/lib/events";
import { routes } from "@/lib/routes";

import { EventDetail, EventRow, EventVisitorAction, eventPlace } from "./events";

// Sections événements rendues à la requête (données en cache), sous `<Suspense>` et `<AppStateBoundary>`.

/** WL21 : événements à venir, ou état vide. */
export async function EventList() {
  await connection();
  const events = await getUpcomingEvents();
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[22px] border-2 border-dashed border-ink-200 px-6 py-12 text-center">
        <Mascot pose="sleep" size={110} />
        <p className="text-lg font-black text-ink-900">Aucun événement à venir</p>
        <p className="max-w-[420px] text-sm font-semibold text-ink-600">
          Les prochains Steamy Events seront annoncés ici. Reviens bientôt !
        </p>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {events.map((event) => (
        <li key={event.slug}>
          <EventRow event={event} />
        </li>
      ))}
    </ul>
  );
}

/** WL23 : fiche d'un événement publié pour le visiteur, avec ses données structurées `Event`. */
export async function EventView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connection();
  const event = await getEvent(slug);
  if (!event) {
    notFound();
  }
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.startsAt,
    endDate: event.endsAt,
    eventAttendanceMode: event.online
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    location: event.online
      ? { "@type": "VirtualLocation", url: new URL(routes.event(event.slug), SITE_URL).toString() }
      : { "@type": "Place", name: eventPlace(event), address: event.city },
    organizer: { "@type": "Organization", name: site.name, url: SITE_URL },
    offers: {
      "@type": "Offer",
      price: event.isFree ? 0 : (event.price ?? 0),
      priceCurrency: "XOF",
      availability: event.seatsLeft > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
    },
  };
  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD : `<` échappé pour qu'aucun contenu ne ferme la balise script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <EventDetail event={event} action={<EventVisitorAction event={event} />} />
    </>
  );
}
