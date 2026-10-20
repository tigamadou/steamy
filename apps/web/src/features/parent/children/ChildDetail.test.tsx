import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";
import { attempt, childDetail, enrollment } from "@/test/parent-fixtures";

const { GET, POST } = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { AttemptList, ChildDetail, ChildDetailSkeleton, ChildDetailView, CourseProgressList, TeacherComments, parseConfirmation } =
  await import("./ChildDetail");
const { getChild, getTeacherComments, TEACHER_COMMENTS_PAGE_SIZE } = await import("./api");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const failure = (status: number, code: string, fields?: Record<string, string>, message = "") =>
  respond(status, {
    error: {
      code,
      message,
      fields: fields && Object.fromEntries(Object.entries(fields).map(([name, text]) => [name, [{ message: text }]])),
    },
  });

describe("ChildDetailView (WPD03)", () => {
  it("fil d'Ariane, carte profil, informations, progression et tentatives", async () => {
    const { container } = render(<ChildDetailView child={childDetail()} />);
    const crumb = screen.getByRole("navigation", { name: "Fil d'Ariane" });
    expect(within(crumb).getByRole("link", { name: "Mes enfants" })).toHaveAttribute("href", "/parent/enfants");
    expect(within(crumb).getByText("Léa Adjovi")).toHaveAttribute("aria-current", "page");

    const card = screen.getByRole("region", { name: "Léa Adjovi" });
    expect(card).toHaveTextContent("13 ans · 4ᵉ · Cotonou");
    expect(within(card).getByText("Badges").nextSibling).toHaveTextContent("5");
    expect(within(card).getByText("Points").nextSibling).toHaveTextContent("120");
    expect(within(card).getByText("Streak").nextSibling).toHaveTextContent("3 j");
    expect(within(card).getByRole("link", { name: "Modifier le profil" })).toHaveAttribute("href", "/parent/enfants/7/modifier");
    expect(within(card).getByRole("link", { name: "Rapport hebdomadaire" })).toHaveAttribute("href", "/parent/enfants/7/rapport");
    expect(within(card).getByRole("button", { name: "Réinitialiser le mot de passe" })).toBeInTheDocument();

    const info = screen.getByRole("heading", { name: "Informations" }).parentElement?.parentElement as HTMLElement;
    expect(within(info).getByText("Identifiant").nextSibling).toHaveTextContent("lea.adjovi");
    expect(within(info).getByText("Lien de parenté").nextSibling).toHaveTextContent("Vous êtes sa mère");
    expect(within(info).getByText("Date de naissance").nextSibling).toHaveTextContent("14 mars 2013");
    expect(within(info).getByText("Inscrit le").nextSibling).toHaveTextContent("1 septembre 2026");
    expect(within(info).getByText("Localité").nextSibling).toHaveTextContent("Cotonou · Cocotomey");
    expect(within(info).getByText("Situation de handicap").nextSibling).toHaveTextContent("Aucune");
    expect(screen.getByRole("link", { name: "Supprimer le compte" })).toHaveAttribute("href", "/parent/enfants/7/supprimer");

    expect(screen.getByRole("progressbar", { name: "Progression : Construis ton robot Bluetooth" })).toHaveAttribute(
      "aria-valuenow",
      "62",
    );
    expect(screen.getByText("5/8 missions terminées")).toBeInTheDocument();
    const attempts = screen.getByRole("region", { name: "Dernières tentatives de quiz" });
    expect(within(attempts).queryByRole("link")).toBeNull();
    expect(attempts).toHaveTextContent("Construis ton robot Bluetooth · Quiz du niveau · 14 octobre 2026");
    expect(attempts).toHaveTextContent("Réussi");

    // Sans commentaire d'enseignant : le bloc l'annonce
    expect(screen.getByRole("region", { name: "Commentaires des enseignants" })).toHaveTextContent(
      "Aucun commentaire des enseignants pour l'instant.",
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("commentaires des enseignants (D63) : texte et date, en lecture seule", () => {
    render(
      <ChildDetailView
        child={childDetail()}
        comments={[
          {
            id: 1,
            body: "Très bon travail sur les capteurs.",
            createdAt: "2026-10-14T10:00:00Z",
            teacherName: "Koffi Adékambi",
            classroomName: "4ᵉ A",
            learnerId: 7,
            attempt: null,
          },
        ]}
      />,
    );
    const comments = screen.getByRole("list", { name: "Commentaires des enseignants" });
    expect(comments).toHaveTextContent("Très bon travail sur les capteurs.");
    expect(comments).toHaveTextContent("Koffi Adékambi · 4ᵉ A ·");
    expect(within(comments).getByText("14 octobre 2026")).toHaveAttribute("datetime", "2026-10-14T10:00:00Z");
    expect(within(comments).queryByRole("button")).toBeNull();
  });

  it("profil incomplet : sans avatar, classe, localité ni identifiant ; lien de parenté sans libellé parent", () => {
    render(
      <ChildDetailView
        child={childDetail({
          avatar: null,
          schoolGrade: null,
          age: null,
          locality: null,
          username: null,
          disability: { id: 2, code: "visuel", label: "Visuel" },
          relationship: { id: 2, code: "pere", label: "Père" },
        })}
      />,
    );
    const info = screen.getByRole("heading", { name: "Informations" }).parentElement?.parentElement as HTMLElement;
    expect(within(info).getByText("Identifiant").nextSibling).toHaveTextContent("Non renseigné");
    expect(within(info).getByText("Lien de parenté").nextSibling).toHaveTextContent("Père");
    expect(within(info).getByText("Localité").nextSibling).toHaveTextContent("Non renseigné");
    expect(within(info).getByText("Situation de handicap").nextSibling).toHaveTextContent("Visuel");
    expect(screen.getByRole("region", { name: "Léa Adjovi" })).not.toHaveTextContent("ans");
  });

  it("création (WPD04) : rappel de l'identifiant à communiquer", () => {
    render(<ChildDetailView child={childDetail()} confirmation="cree" />);
    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent("Le compte de Léa est créé.");
    expect(notice).toHaveTextContent("Son identifiant : lea.adjovi.");
  });

  it("modification (WPD10) : confirmation fermable", async () => {
    render(<ChildDetailView child={childDetail()} confirmation="modifie" />);
    expect(await screen.findByText("Le profil de Léa est enregistré.")).toBeInTheDocument();
  });

  it("suppression programmée : rappel daté au lieu du lien « Supprimer le compte »", () => {
    render(
      <ChildDetailView child={childDetail({ deletion: { id: 4, status: "scheduled", scheduledFor: "2026-11-18T10:00:00Z" } })} />,
    );
    expect(screen.getByText(/suppression programmée le/)).toHaveTextContent(
      "Compte désactivé : suppression programmée le 18 novembre 2026.",
    );
    expect(screen.queryByRole("link", { name: "Supprimer le compte" })).toBeNull();
  });

  it("suppression programmée sans date", () => {
    render(<ChildDetailView child={childDetail({ deletion: { id: 4, status: "scheduled", scheduledFor: null } })} />);
    expect(screen.getByText("Compte désactivé : suppression programmée.")).toBeInTheDocument();
  });

  it("suppression demandée par l'enfant : lien vers WPD09 avec la demande", () => {
    render(<ChildDetailView child={childDetail({ deletion: { id: 9, status: "pending_parent", scheduledFor: null } })} />);
    expect(screen.getByRole("link", { name: "Examiner la demande de suppression" })).toHaveAttribute(
      "href",
      "/parent/enfants/7/supprimer?demande=9",
    );
  });
});

describe("CourseProgressList, AttemptList, TeacherComments", () => {
  it("parcours terminé : badge et barre en vert ; états vides", () => {
    const { unmount } = render(
      <CourseProgressList courses={[enrollment({ status: "completed", progressPct: 100, course: { ...enrollment().course, emoji: "" } })]} />,
    );
    expect(screen.getByText("Terminé")).toBeInTheDocument();
    expect(screen.getByText("🤖")).toBeInTheDocument();
    unmount();
    render(
      <>
        <CourseProgressList courses={[]} />
        <AttemptList attempts={[]} courses={[]} />
        <TeacherComments comments={[]} />
      </>,
    );
    expect(screen.getByText("Aucun parcours commencé pour l'instant.")).toBeInTheDocument();
    expect(screen.getByText("Aucun quiz passé pour l'instant.")).toBeInTheDocument();
    expect(screen.getByText("Aucun commentaire des enseignants pour l'instant.")).toBeInTheDocument();
  });

  it("tentative d'une évaluation de projet, parcours inconnu", () => {
    render(
      <AttemptList
        attempts={[attempt({ status: "warn", quiz: { ...attempt().quiz, kind: "summative", courseSlug: "autre" } })]}
        courses={[]}
      />,
    );
    const region = screen.getByRole("region", { name: "Dernières tentatives de quiz" });
    expect(region).toHaveTextContent("Évaluation du projet · 14 octobre 2026");
    expect(region).toHaveTextContent("🏁");
    expect(region).toHaveTextContent("À refaire");
  });
});

describe("ResetChildPasswordDialog (WPD03, D26)", () => {
  beforeEach(() => POST.mockReset());

  async function openDialog() {
    render(<ChildDetailView child={childDetail()} />);
    await userEvent.click(screen.getByRole("button", { name: "Réinitialiser le mot de passe" }));
    return screen.getByRole("dialog", { name: "Nouveau mot de passe pour Léa" });
  }

  async function fill(dialog: HTMLElement, password: string, confirm = password) {
    await userEvent.type(within(dialog).getByLabelText(/^Nouveau mot de passe/), password);
    await userEvent.type(within(dialog).getByLabelText(/^Confirmation/), confirm);
  }

  it("identifiant rappelé, « Communiquez-le à votre enfant », règles PwReq", async () => {
    const dialog = await openDialog();
    expect(dialog).toHaveTextContent("Identifiant : lea.adjovi. L'ancien mot de passe ne fonctionnera plus.");
    expect(dialog).toHaveTextContent("Communiquez-le à votre enfant.");
    expect(within(dialog).getByText("Au moins 8 caractères")).toBeInTheDocument();
    expect(await axe(dialog)).toHaveNoViolations();
  });

  it("règles non respectées : aucun appel, erreur sous le champ", async () => {
    const dialog = await openDialog();
    await fill(dialog, "court", "autre");
    await userEvent.click(within(dialog).getByRole("button", { name: "Enregistrer" }));
    expect(POST).not.toHaveBeenCalled();
    expect((await within(dialog).findAllByText(/Choisissez un mot de passe qui respecte les règles/)).length).toBeGreaterThan(0);
  });

  it("enregistre, ferme la modale et confirme", async () => {
    POST.mockResolvedValue(respond(204));
    const dialog = await openDialog();
    await fill(dialog, "robot2026");
    await userEvent.click(within(dialog).getByRole("button", { name: "Enregistrer" }));
    expect(POST).toHaveBeenCalledWith("/api/accounts/children/{id}/password-reset/", {
      params: { path: { id: "7" } },
      body: { password: "robot2026" },
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await screen.findByText("Le mot de passe de Léa est modifié. Communiquez-le-lui.")).toBeInTheDocument();
  });

  it("`PASSWORD_TOO_WEAK` du serveur : sous le champ", async () => {
    POST.mockResolvedValue(failure(400, "VALIDATION_ERROR", { password: "Au moins une lettre et un chiffre." }));
    const dialog = await openDialog();
    await fill(dialog, "robot2026");
    await userEvent.click(within(dialog).getByRole("button", { name: "Enregistrer" }));
    expect((await within(dialog).findAllByText("Au moins une lettre et un chiffre.")).length).toBeGreaterThan(0);
  });

  it("autre erreur : message au vouvoiement ; « Annuler » ferme sans appel", async () => {
    POST.mockResolvedValue(failure(500, "SERVER_ERROR"));
    const dialog = await openDialog();
    await fill(dialog, "robot2026");
    await userEvent.click(within(dialog).getByRole("button", { name: "Enregistrer" }));
    expect(await within(dialog).findByText(/Réessayez dans quelques instants/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("enfant sans identifiant : seul l'avertissement", async () => {
    render(<ChildDetailView child={childDetail({ username: null })} />);
    await userEvent.click(screen.getByRole("button", { name: "Réinitialiser le mot de passe" }));
    expect(screen.getByRole("dialog")).not.toHaveTextContent("Identifiant :");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("ChildDetail (serveur) et getChild", () => {
  beforeEach(() => GET.mockReset());

  const params = (id: string) => Promise.resolve({ id });

  it("lit l'enfant et la confirmation de l'URL", async () => {
    GET.mockResolvedValue({ data: childDetail(), response: new Response(null, { status: 200 }) });
    const tree = (await ChildDetail({ params: params("7"), searchParams: Promise.resolve({ confirmation: "cree" }) })) as ReactElement<
      Parameters<typeof ChildDetailView>[0]
    >;
    expect(GET).toHaveBeenCalledWith("/api/accounts/children/{id}/", { params: { path: { id: "7" } } });
    expect(tree.type).toBe(ChildDetailView);
    expect(tree.props.confirmation).toBe("cree");
  });

  it("enfant d'un autre parent (404) : introuvable", async () => {
    GET.mockResolvedValue({ error: { code: "NOT_FOUND", message: "" }, response: new Response(null, { status: 404 }) });
    await expect(ChildDetail({ params: params("99"), searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("identifiant non numérique : introuvable sans appel", async () => {
    await expect(getChild("abc")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(GET).not.toHaveBeenCalled();
  });

  it("session perdue : ne rend rien", async () => {
    GET.mockResolvedValue({ response: new Response(null, { status: 401 }) });
    expect(await ChildDetail({ params: params("7"), searchParams: Promise.resolve({}) })).toBeNull();
  });

  it("parseConfirmation ignore les valeurs inconnues ; squelette au vouvoiement", () => {
    expect(parseConfirmation("modifie")).toBe("modifie");
    expect(parseConfirmation(["cree"])).toBeUndefined();
    expect(parseConfirmation("autre")).toBeUndefined();
    render(<ChildDetailSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement du profil de votre enfant…" })).toBeInTheDocument();
  });
});

describe("getTeacherComments", () => {
  beforeEach(() => GET.mockReset());

  it("lit les commentaires de l'enfant ; une lecture en échec donne une liste vide", async () => {
    const comment = { id: 1, body: "Bravo", createdAt: "2026-10-14T10:00:00Z", teacherName: "K. A.", classroomName: "4ᵉ A", learnerId: 7, attempt: null };
    GET.mockResolvedValueOnce(respond(200, { data: { results: [comment] } }));
    expect(await getTeacherComments("7")).toEqual([comment]);
    expect(GET).toHaveBeenCalledWith("/api/classrooms/comments/", {
      params: { query: { learnerId: 7, pageSize: TEACHER_COMMENTS_PAGE_SIZE } },
    });
    GET.mockResolvedValueOnce(respond(200, { data: {} }));
    expect(await getTeacherComments("7")).toEqual([]);
    GET.mockResolvedValueOnce(respond(500));
    expect(await getTeacherComments("7")).toEqual([]);
  });
});

