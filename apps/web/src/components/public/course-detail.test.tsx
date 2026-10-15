import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { courseDetail } from "@/test/api-fixtures";
import { axe } from "@/test/axe";

import { CourseDetail, CourseDetailSkeleton, offerOf, stringList } from "./course-detail";

const KIT = { slug: "steamy-bot-v1", name: "Steamy Bot v1" };

describe("WL22 · fiche parcours", () => {
  it("fil d'Ariane, en-tête, présentation, objectifs, plan, certification et public", () => {
    render(<CourseDetail course={courseDetail()} />);
    const crumbs = within(screen.getByRole("navigation", { name: "Fil d'Ariane" }));
    expect(crumbs.getByRole("link", { name: "Robotique" })).toHaveAttribute("href", "/parcours?categorie=robotique");
    expect(screen.getByRole("heading", { level: 1, name: "Initiation à Scratch" })).toBeInTheDocument();
    expect(screen.getByText("⏱ 4 h environ")).toBeInTheDocument();
    expect(screen.getByText("Premiers blocs", { selector: "li" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Plan du parcours · 2 projets, 2 niveaux, 3 missions" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 niveau · 2 missions")).toBeInTheDocument();
    expect(screen.getByText("1 niveau · 1 mission")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Certification délivrée" })).toBeInTheDocument();
    expect(screen.getByText("Prérequis : Savoir lire")).toBeInTheDocument();
  });

  it("plan en volets repliables au clavier : le premier projet ouvert, titres des missions seulement", async () => {
    const { container } = render(<CourseDetail course={courseDetail()} />);
    const [first, second] = container.querySelectorAll("details");
    expect(first).toHaveAttribute("open");
    expect(second).not.toHaveAttribute("open");
    expect(within(first).getByText("Découvrir l'interface")).toBeInTheDocument();
    expect(within(first).getByRole("heading", { level: 3, name: "Niveau 1 · L'interface" })).toBeInTheDocument();

    // Volet natif `details`/`summary` : focusable et activable (Entrée et Espace vérifiés par Playwright)
    const summary = second.querySelector("summary")!;
    summary.focus();
    expect(summary).toHaveFocus();
    await userEvent.click(summary);
    expect(second).toHaveAttribute("open");
  });

  it("gratuit : « Commencer » et « Se connecter » reviennent sur la fiche", () => {
    render(<CourseDetail course={courseDetail()} />);
    const aside = within(screen.getByRole("complementary", { name: "S'inscrire au parcours" }));
    expect(aside.getByRole("link", { name: "Commencer" })).toHaveAttribute(
      "href",
      "/inscription?next=%2Fparcours%2Finitiation-scratch",
    );
    expect(aside.getByRole("link", { name: "J'ai déjà un compte · Se connecter" })).toHaveAttribute(
      "href",
      "/connexion?next=%2Fparcours%2Finitiation-scratch",
    );
    expect(aside.getByText("Gratuit · accès complet")).toBeInTheDocument();
  });

  it("payant : prix serveur et « Demander à mon parent »", () => {
    render(<CourseDetail course={courseDetail({ isFree: false, price: 18000, durationHours: 0 })} />);
    expect(screen.getAllByText(/18\s000 F CFA/)).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Demander à mon parent" })).toBeInTheDocument();
    expect(screen.queryByText(/h de contenu environ/)).not.toBeInTheDocument();
  });

  it("kit requis : mention du Kit Code, sans prix séparé (D36)", () => {
    render(<CourseDetail course={courseDetail({ isFree: false, price: 25000, requiredKit: KIT })} />);
    expect(screen.getByText(/s'obtient avec le/)).toHaveTextContent("Steamy Bot v1");
    expect(screen.getByText("📦 Avec le Kit Code")).toBeInTheDocument();
    expect(screen.getByText("Kit Steamy Bot v1 requis")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "J'ai déjà un Kit Code · Se connecter" })).toBeInTheDocument();
    expect(screen.queryByText(/25\s000/)).not.toBeInTheDocument();
  });

  it("masque les sections sans contenu", () => {
    render(
      <CourseDetail
        course={courseDetail({ outcomes: null, prerequisites: [], audience: "", certificateEnabled: false, emoji: "" })}
      />,
    );
    expect(screen.queryByRole("heading", { name: "Ce que tu vas apprendre" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Pour qui ?" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Certification délivrée" })).not.toBeInTheDocument();
  });

  it("public seul, sans prérequis", () => {
    render(<CourseDetail course={courseDetail({ prerequisites: undefined })} />);
    expect(screen.getByText("Apprenants de 10 à 17 ans")).toBeInTheDocument();
    expect(screen.queryByText(/Prérequis/)).not.toBeInTheDocument();
  });

  it("skeleton verbalisé", () => {
    render(<CourseDetailSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement du parcours…" })).toBeInTheDocument();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <main>
        <CourseDetail course={courseDetail()} />
      </main>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("helpers", () => {
  it("offerOf : kit, gratuit ou payant", () => {
    expect(offerOf(courseDetail({ requiredKit: KIT }))).toBe("kit");
    expect(offerOf(courseDetail())).toBe("free");
    expect(offerOf(courseDetail({ isFree: undefined }))).toBe("paid");
  });

  it("stringList : ne garde que les chaînes d'un tableau", () => {
    expect(stringList(["a", 1, "b"])).toEqual(["a", "b"]);
    expect(stringList("a")).toEqual([]);
  });
});
