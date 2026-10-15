import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { steamyEvent } from "@/test/api-fixtures";
import { axe } from "@/test/axe";

import {
  EventDetail,
  EventDetailSkeleton,
  EventListSkeleton,
  EventRow,
  EventVisitorAction,
  eventPlace,
  eventState,
} from "./events";

describe("état et lieu d'un événement", () => {
  it("ouvert, complet, candidatures closes, passé", () => {
    expect(eventState(steamyEvent())).toBe("open");
    expect(eventState(steamyEvent({ seatsLeft: 0, applicationsOpen: false }))).toBe("full");
    expect(eventState(steamyEvent({ applicationsOpen: false }))).toBe("closed");
    expect(eventState(steamyEvent({ isPast: true }))).toBe("past");
  });

  it("lieu : « En ligne » ou ville · lieu", () => {
    expect(eventPlace(steamyEvent())).toBe("Porto-Novo · Maison des jeunes");
    expect(eventPlace(steamyEvent({ online: true }))).toBe("En ligne");
    expect(eventPlace(steamyEvent({ place: "" }))).toBe("Porto-Novo");
  });
});

describe("EventRow (WL21)", () => {
  it("date, titre-lien vers la fiche, lieu, créneau et prix", () => {
    render(<EventRow event={steamyEvent()} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("NOV")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Atelier Électronique débutant" })).toHaveAttribute(
      "href",
      "/evenements/atelier-electronique",
    );
    expect(screen.getByText(/14:00 – 16:30/)).toBeInTheDocument();
    expect(screen.getByText("Gratuit")).toBeInTheDocument();
  });

  it("payant et complet", () => {
    render(<EventRow event={steamyEvent({ isFree: false, price: 2000, seatsLeft: 0 })} />);
    expect(screen.getByText("Complet")).toBeInTheDocument();
    expect(screen.getByText(/2\s000 F CFA/)).toBeInTheDocument();
  });

  it("payant sans prix renseigné : 0 F CFA", () => {
    render(<EventRow event={steamyEvent({ isFree: false, price: undefined })} />);
    expect(screen.getByText("0 F CFA")).toBeInTheDocument();
  });
});

describe("EventVisitorAction (WL23)", () => {
  it("ouvert : places, « Participer » vers la connexion avec retour, accord parental", () => {
    render(<EventVisitorAction event={steamyEvent()} />);
    expect(screen.getByText("8 places restantes")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Places attribuées" })).toHaveAttribute("aria-valuenow", "12");
    expect(screen.getByRole("link", { name: "Participer" })).toHaveAttribute(
      "href",
      "/connexion?next=%2Fevenements%2Fatelier-electronique",
    );
    expect(screen.getByRole("link", { name: "Créer un compte" })).toHaveAttribute(
      "href",
      "/inscription?next=%2Fevenements%2Fatelier-electronique",
    );
    expect(screen.getByText("Participation soumise à l'accord du parent.")).toBeInTheDocument();
  });

  it("payant : prix, badge et paiement par le parent", () => {
    render(<EventVisitorAction event={steamyEvent({ isFree: false, price: 5000 })} />);
    expect(screen.getByText("Payant")).toBeInTheDocument();
    expect(screen.getByText(/qui règle aussi l'inscription/)).toBeInTheDocument();
  });

  it.each([
    [{ seatsLeft: 0, applicationsOpen: false }, "Complet", /Les 20 places sont prises/],
    [{ applicationsOpen: false }, "Candidatures closes", /date limite de candidature est passée/],
    [{ isPast: true, applicationsOpen: false }, "Événement terminé", /a eu lieu le jeudi 5 novembre 2026/],
  ])("CTA désactivé avec motif (%o)", (overrides, label, reason) => {
    render(<EventVisitorAction event={steamyEvent(overrides)} />);
    expect(screen.getByRole("button", { name: label })).toBeDisabled();
    expect(screen.getByText(reason)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir les prochains événements" })).toHaveAttribute("href", "/evenements");
    expect(screen.queryByRole("link", { name: "Participer" })).not.toBeInTheDocument();
  });

  it("capacité nulle : jauge pleine", () => {
    render(<EventVisitorAction event={steamyEvent({ capacity: 0, seatsLeft: 0 })} />);
    expect(screen.getByRole("progressbar").firstElementChild).toHaveStyle({ width: "100%" });
  });
});

describe("EventDetail (WL23, réutilisable)", () => {
  it("fil d'Ariane, en-tête, description, infos pratiques et encart fourni par l'appelant", async () => {
    const { container } = render(
      <main>
        <EventDetail event={steamyEvent()} action={<p>encart</p>} />
      </main>,
    );
    expect(within(screen.getByRole("navigation", { name: "Fil d'Ariane" })).getByRole("link")).toHaveAttribute(
      "href",
      "/evenements",
    );
    expect(screen.getByRole("heading", { level: 1, name: "Atelier Électronique débutant" })).toBeInTheDocument();
    expect(screen.getByText("👥 12 – 15 ans")).toBeInTheDocument();
    expect(screen.getByText(/Candidatures jusqu'au lundi 2 novembre 2026/)).toBeInTheDocument();
    expect(within(screen.getByRole("complementary")).getByText("encart")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("en ligne, sans public précisé", () => {
    render(<EventDetail event={steamyEvent({ online: true, audience: "" })} action={null} />);
    expect(screen.getByText(/le lien est envoyé après l'accord du parent/)).toBeInTheDocument();
    expect(screen.queryByText(/👥/)).not.toBeInTheDocument();
  });

  it("skeletons verbalisés", () => {
    render(
      <>
        <EventListSkeleton />
        <EventDetailSkeleton />
      </>,
    );
    expect(screen.getByRole("status", { name: "Chargement des événements…" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Chargement de l'événement…" })).toBeInTheDocument();
  });
});
