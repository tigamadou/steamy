import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";
import { classroom, dashboard, dropout, review } from "@/test/teacher-fixtures";

const GET = vi.fn();
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));

const { ClassCard, memberCountLabel, pendingInvitationsLabel } = await import("./ClassCard");
const { ReviewRow, reviewContext } = await import("./ReviewRow");
const { DropoutRow } = await import("./DropoutRow");
const { TeacherHome, TeacherHomeSkeleton, TeacherHomeView, NoClassroom, classesHeadline } = await import(
  "./TeacherHome"
);

const respond = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });

describe("ClassCard", () => {
  it("libellés des effectifs", () => {
    expect(memberCountLabel(0)).toBe("Aucun élève");
    expect(memberCountLabel(1)).toBe("1 élève");
    expect(memberCountLabel(12)).toBe("12 élèves");
    expect(pendingInvitationsLabel(0)).toBe("");
    expect(pendingInvitationsLabel(1)).toBe("1 invitation en attente");
    expect(pendingInvitationsLabel(2)).toBe("2 invitations en attente");
  });

  it("toute la carte mène à WT04 : parcours, élèves, invitations en attente et progression de l'API", async () => {
    const { container } = render(<ClassCard classroom={classroom()} />);
    const link = screen.getByRole("link", { name: /4ᵉ B · Robotique/ });
    expect(link).toHaveAttribute("href", "/enseignant/classes/3");
    expect(link).toHaveTextContent("Robot Bluetooth");
    expect(link).toHaveTextContent("12 élèves · 2 invitations en attente");
    expect(screen.getByRole("progressbar", { name: "Progression moyenne" })).toHaveAttribute("aria-valuenow", "42");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sans invitation en attente, rien n'est annoncé", () => {
    render(<ClassCard classroom={classroom({ memberCount: 1, pendingInvitationCount: 0 })} />);
    expect(screen.getByRole("link")).toHaveTextContent(/1 élève(?! ·)/);
    expect(screen.getByRole("link")).not.toHaveTextContent("invitation");
  });
});

describe("ReviewRow", () => {
  it("contexte : niveau, sinon projet, puis classe", () => {
    expect(reviewContext(review())).toBe("Niveau 2 · 4ᵉ B · Robotique");
    expect(
      reviewContext(review({ quiz: { ...review().quiz, levelTitle: null, projectTitle: "Robot suiveur" } })),
    ).toBe("Robot suiveur · 4ᵉ B · Robotique");
  });

  it("élève, quiz, statut et score du serveur ; « Commenter » ouvre WT05 sur la tentative", async () => {
    const { container } = render(<ReviewRow review={review()} />);
    expect(screen.getByText("Yao Kpadé · Quiz du niveau 2")).toBeInTheDocument();
    expect(screen.getByText("Échoué")).toBeInTheDocument();
    expect(screen.getByText("33 %")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Commenter la tentative de Yao Kpadé" })).toHaveAttribute(
      "href",
      "/enseignant/eleves/21?classe=3&tentative=90",
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("DropoutRow", () => {
  it("élève, classe, dernière activité et profil WT05 de la classe", async () => {
    const { container } = render(<DropoutRow dropout={dropout()} />);
    expect(screen.getByText("Sena Kpadé")).toBeInTheDocument();
    expect(screen.getByText(/4ᵉ B · Robotique · dernière activité 10 octobre 2026/)).toBeInTheDocument();
    expect(screen.getByText("Décrochage")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir le profil de Sena Kpadé" })).toHaveAttribute(
      "href",
      "/enseignant/eleves/22?classe=3",
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("TeacherHomeView (WT01)", () => {
  it("titre du bandeau", () => {
    expect(classesHeadline({ classroomCount: 0, learnerCount: 0 })).toBe("Aucune classe pour l'instant");
    expect(classesHeadline({ classroomCount: 1, learnerCount: 1 })).toBe("1 classe · 1 élève encadré");
    expect(classesHeadline({ classroomCount: 3, learnerCount: 54 })).toBe("3 classes · 54 élèves encadrés");
  });

  it("compteurs de l'API, classes, « À revoir » et « Décrochage »", async () => {
    const { container } = render(<TeacherHomeView dashboard={dashboard()} />);
    expect(screen.getByRole("heading", { level: 2, name: "2 classes · 15 élèves encadrés" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ajouter des élèves" })).toHaveAttribute("href", "/enseignant/eleves/ajouter");
    const stats = screen.getByRole("region", { name: "Vos statistiques" });
    expect(within(stats).getAllByRole("definition").map((dd) => dd.textContent)).toEqual(["15", "2", "6"]);
    expect(within(screen.getByRole("list", { name: "Mes classes" })).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Voir tout" })).toHaveAttribute("href", "/enseignant/classes");
    expect(within(screen.getByRole("list", { name: "Tentatives à revoir" })).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Voir tout (6)" })).toHaveAttribute(
      "href",
      "/enseignant/evaluations?filtre=a-revoir",
    );
    expect(within(screen.getByRole("list", { name: "Élèves en décrochage" })).getAllByRole("listitem")).toHaveLength(1);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sans lien « Voir tout » quand toute la liste « À revoir » est affichée", () => {
    render(<TeacherHomeView dashboard={dashboard({ toReviewCount: 1 })} />);
    expect(screen.queryByRole("link", { name: /Voir tout \(/ })).toBeNull();
  });

  it("« À revoir » et « Décrochage » vides", async () => {
    const { container } = render(
      <TeacherHomeView dashboard={dashboard({ toReview: [], toReviewCount: 0, dropouts: [], dropoutCount: 0 })} />,
    );
    expect(screen.getByText("Aucune tentative à revoir pour le moment.")).toBeInTheDocument();
    expect(screen.getByText(/Aucun élève en décrochage/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sans classe : Zeti et « Créer une classe » vers WT13, sans « À revoir » ni « Décrochage »", async () => {
    const empty = dashboard({
      classroomCount: 0,
      learnerCount: 0,
      toReviewCount: 0,
      dropoutCount: 0,
      classrooms: [],
      toReview: [],
      dropouts: [],
    });
    const { container } = render(<TeacherHomeView dashboard={empty} />);
    expect(screen.getByRole("heading", { level: 2, name: "Aucune classe pour l'instant" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Créer une classe" })).toHaveAttribute("href", "/enseignant/classes/nouvelle");
    expect(screen.queryByRole("link", { name: "Ajouter des élèves" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "À revoir" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Décrochage" })).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("registre : vouvoiement, jamais « tu », « formateur » ni « À corriger »", () => {
    const { container: filled } = render(<TeacherHomeView dashboard={dashboard()} />);
    const { container: empty } = render(
      <TeacherHomeView
        dashboard={dashboard({ classroomCount: 0, classrooms: [], toReview: [], dropouts: [], toReviewCount: 0 })}
      />,
    );
    render(<NoClassroom />);
    const text = [filled, empty, document.body].map((node) => node.textContent ?? "").join(" ");
    expect(text).not.toMatch(/(?<!\p{L})(tu|ton|ta|tes|toi|te)(?!\p{L})/iu);
    expect(text).not.toMatch(/formateur|à corriger/i);
    expect(text).toMatch(/Suivez la progression de vos classes/);
  });
});

describe("TeacherHome (serveur)", () => {
  beforeEach(() => GET.mockReset());

  it("lit le tableau de bord de l'API", async () => {
    GET.mockResolvedValue(respond(200, dashboard()));
    const tree = await TeacherHome();
    expect(GET).toHaveBeenCalledWith("/api/classrooms/dashboard/");
    render(tree);
    expect(screen.getByRole("heading", { level: 2, name: "2 classes · 15 élèves encadrés" })).toBeInTheDocument();
  });

  it("sans session (401), ne rend rien : la garde de rôle redirige", async () => {
    GET.mockResolvedValue(respond(401));
    expect(await TeacherHome()).toBeNull();
  });

  it("erreur de l'API : levée vers l'enveloppe d'erreur", async () => {
    GET.mockResolvedValue(respond(500));
    await expect(TeacherHome()).rejects.toThrow();
  });
});

describe("TeacherHomeSkeleton", () => {
  it("annonce le chargement", async () => {
    const { container } = render(<TeacherHomeSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de votre espace…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
