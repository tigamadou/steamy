import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";
import { classroom, invitation, member, school } from "@/test/teacher-fixtures";

const GET = vi.fn();
const POST = vi.fn();
const PATCH = vi.fn();
const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST, PATCH }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/lib/use-referential", () => ({
  useReferential: () => ({
    items: [
      { code: "4e", label: "4ᵉ" },
      { code: "3e", label: "3ᵉ" },
    ],
    status: "ready",
    retry: vi.fn(),
  }),
}));

const { CLASSROOMS_PAGE_SIZE, MEMBERS_PAGE_SIZE, getClassroom, getClassrooms, getMembers, getSchool } = await import("./api");
const { QuotaNotice, creationBlocked } = await import("./QuotaNotice");
const { NoClassroomYet, TeacherClasses, TeacherClassesSkeleton, TeacherClassesView } = await import("./TeacherClasses");
const { ClassroomForm } = await import("./ClassroomForm");
const { EditClassroom, NewClassroom, ClassroomFormSkeleton } = await import("./ClassroomFormScreen");
const { InvitationRow, MemberRow, invitationLabel } = await import("./MemberRow");
const { ClassroomMembers, ClassroomMembersSkeleton, ClassroomMembersView, EmptyClassroom } = await import(
  "./ClassroomMembers"
);

const respond = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });
const failure = (status: number, code: string, fields?: Record<string, string>) => ({
  error: {
    code,
    message: "",
    fields: fields && Object.fromEntries(Object.entries(fields).map(([name, text]) => [name, [{ message: text }]])),
  },
  response: new Response(null, { status }),
});

beforeEach(() => {
  GET.mockReset();
  POST.mockReset();
  PATCH.mockReset();
  router.push.mockReset();
  router.refresh.mockReset();
});

describe("lectures de l'API", () => {
  it("classes, école", async () => {
    GET.mockResolvedValue(respond(200, { results: [classroom()] }));
    expect(await getClassrooms()).toEqual([classroom()]);
    expect(GET).toHaveBeenCalledWith("/api/classrooms/", { params: { query: { pageSize: CLASSROOMS_PAGE_SIZE } } });
    GET.mockResolvedValue(respond(200, {}));
    expect(await getClassrooms()).toEqual([]);
    GET.mockResolvedValue(respond(401));
    expect(await getClassrooms()).toBeNull();
    GET.mockResolvedValue(respond(200, school()));
    expect((await getSchool())?.name).toBe("Collège Steamy de Cotonou");
  });

  it("classe : 404 et identifiant non numérique → introuvable, sans session → null", async () => {
    await expect(getClassroom("abc")).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(getMembers("abc")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(GET).not.toHaveBeenCalled();
    GET.mockResolvedValue(respond(200, classroom()));
    expect((await getClassroom("3"))?.id).toBe(3);
    expect(GET).toHaveBeenCalledWith("/api/classrooms/{id}/", { params: { path: { id: "3" } } });
    GET.mockResolvedValue(respond(404));
    await expect(getClassroom("9")).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(getMembers("9")).rejects.toThrow("NEXT_NOT_FOUND");
    GET.mockResolvedValue(respond(401));
    expect(await getClassroom("3")).toBeNull();
    expect(await getMembers("3")).toBeNull();
  });

  it("élèves : une page lue dans l'API", async () => {
    GET.mockResolvedValue(respond(200, { results: [member()] }));
    expect(await getMembers("3")).toEqual([member()]);
    expect(GET).toHaveBeenCalledWith("/api/classrooms/{id}/members/", {
      params: { path: { id: "3" }, query: { pageSize: MEMBERS_PAGE_SIZE } },
    });
    GET.mockResolvedValue(respond(200, {}));
    expect(await getMembers("3")).toEqual([]);
  });
});

describe("QuotaNotice", () => {
  it("quota restant, invitations comprises, lu dans l'API", async () => {
    const { container } = render(<QuotaNotice school={school()} />);
    expect(screen.getByText("Offre Classe Robotique 2026")).toBeInTheDocument();
    expect(screen.getByText("3 / 5")).toBeInTheDocument();
    expect(screen.getByText("54 / 120")).toBeInTheDocument();
    expect(screen.getByText(/Il reste 2 classes et 66 places d'élèves, invitations en attente comprises/)).toBeInTheDocument();
    expect(screen.getByText(/Valable jusqu'au 31 décembre 2026/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("singulier, sans date de validité", () => {
    render(<QuotaNotice school={school({ classroomsLeft: 1, learnersLeft: 1, validUntil: null })} />);
    expect(screen.getByText(/Il reste 1 classe et 1 place d'élève,/)).toBeInTheDocument();
    expect(screen.queryByText(/Valable/)).toBeNull();
  });

  it("quota de classes atteint", () => {
    const full = school({ classroomsLeft: 0, classroomsUsed: 5 });
    expect(creationBlocked(full)).toBe(true);
    render(<QuotaNotice school={full} />);
    expect(screen.getByText(/Le quota de classes de l'offre est atteint/)).toBeInTheDocument();
  });

  it("offre échue : création bloquée, quotas à zéro sans division par zéro", () => {
    const expired = school({ offerExpired: true, classroomQuota: 0, learnerQuota: 0, learnersLeft: 0 });
    expect(creationBlocked(expired)).toBe(true);
    expect(creationBlocked(school())).toBe(false);
    render(<QuotaNotice school={expired} />);
    expect(screen.getByText(/Échue depuis le 31 décembre 2026/)).toBeInTheDocument();
    expect(screen.getByText(/L'offre de l'établissement est échue/)).toBeInTheDocument();
  });
});

describe("WT03 · mes classes", () => {
  it("cartes, « Créer une classe » vers WT13, quota", async () => {
    const { container } = render(<TeacherClassesView classrooms={[classroom(), classroom({ id: 4, name: "3ᵉ A" })]} school={school()} />);
    expect(screen.getByRole("heading", { level: 2, name: "2 classes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Créer une classe" })).toHaveAttribute("href", "/enseignant/classes/nouvelle");
    expect(within(screen.getByRole("list", { name: "Mes classes" })).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("complementary", { name: "Quota de l'offre" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("une classe : singulier", () => {
    render(<TeacherClassesView classrooms={[classroom()]} school={school()} />);
    expect(screen.getByRole("heading", { level: 2, name: "1 classe" })).toBeInTheDocument();
  });

  it("quota atteint : bouton désactivé et explication ; offre échue : autre explication", () => {
    const { unmount } = render(
      <TeacherClassesView classrooms={[classroom()]} school={school({ classroomsLeft: 0 })} />,
    );
    expect(screen.queryByRole("link", { name: "Créer une classe" })).toBeNull();
    expect(screen.getByRole("button", { name: "Créer une classe" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Créer une classe" })).toHaveAccessibleDescription(
      /quota de classes de l'offre est atteint/,
    );
    unmount();
    render(<TeacherClassesView classrooms={[classroom()]} school={school({ offerExpired: true })} />);
    expect(screen.getByText(/L'offre de votre établissement est échue : la création de classes est bloquée/)).toBeInTheDocument();
  });

  it("état vide : Zeti et « Créer une classe », désactivé si le quota l'interdit", () => {
    const { unmount } = render(<TeacherClassesView classrooms={[]} school={school()} />);
    expect(screen.getByRole("heading", { level: 2, name: "Aucune classe" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Créer une classe" })).toBeInTheDocument();
    unmount();
    render(<NoClassroomYet blocked />);
    expect(screen.getByRole("button", { name: "Créer une classe" })).toBeDisabled();
  });

  it("serveur : lit classes et école ; sans session ne rend rien", async () => {
    GET.mockImplementation(async (path: string) =>
      path.includes("school") ? respond(200, school()) : respond(200, { results: [classroom()] }),
    );
    render(await TeacherClasses());
    expect(screen.getByRole("heading", { level: 2, name: "1 classe" })).toBeInTheDocument();
    GET.mockResolvedValue(respond(401));
    expect(await TeacherClasses()).toBeNull();
  });

  it("squelette accessible", async () => {
    const { container } = render(<TeacherClassesSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de vos classes…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("WT13 · ClassroomForm (création)", () => {
  async function fill(user: ReturnType<typeof userEvent.setup>, name = "4ᵉ B · Robotique") {
    await user.type(screen.getByLabelText(/Nom de la classe/), name);
    await user.click(screen.getByRole("radio", { name: /Initiation à Scratch/ }));
  }

  it("champs de la maquette : nom, parcours de l'offre, niveau facultatif, établissement en lecture seule, quota", async () => {
    const { container } = render(<ClassroomForm school={school()} />);
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByLabelText("Établissement")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Établissement")).toHaveValue("Collège Steamy de Cotonou · Cotonou");
    expect(screen.getByRole("combobox", { name: /Niveau scolaire/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Annuler" })).toHaveAttribute("href", "/enseignant/classes");
    expect(screen.getByRole("complementary", { name: "Quota de l'offre" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("crée la classe puis ouvre WT04 avec la confirmation", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue({ data: classroom({ id: 7 }), response: new Response(null, { status: 201 }) });
    render(<ClassroomForm school={school()} />);
    await fill(user);
    await user.selectOptions(screen.getByRole("combobox", { name: /Niveau scolaire/ }), "4e");
    await user.click(screen.getByRole("button", { name: "Créer la classe" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/api/classrooms/", {
        body: { name: "4ᵉ B · Robotique", courseSlug: "scratch", schoolGrade: "4e" },
      }),
    );
    expect(router.push).toHaveBeenCalledWith("/enseignant/classes/7?confirmation=creee");
  });

  it("niveau scolaire non choisi : envoyé nul", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue({ data: classroom({ id: 7 }), response: new Response(null, { status: 201 }) });
    render(<ClassroomForm school={school()} />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Créer la classe" }));
    await waitFor(() => expect(POST).toHaveBeenCalled());
    expect(POST.mock.calls[0][1].body.schoolGrade).toBeNull();
  });

  it("nom et parcours manquants : erreurs sous les champs, aucun appel", async () => {
    const user = userEvent.setup();
    render(<ClassroomForm school={school()} />);
    await user.click(screen.getByRole("button", { name: "Créer la classe" }));
    expect((await screen.findAllByText("Indiquez le nom de la classe.")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Choisissez un parcours.").length).toBeGreaterThan(0);
    expect(POST).not.toHaveBeenCalled();
  });

  it.each([
    ["CLASSROOM_NAME_TAKEN", "Une classe porte déjà ce nom dans votre établissement."],
    ["COURSE_NOT_IN_OFFER", "Ce parcours ne fait plus partie de l'offre de l'école. Choisissez-en un autre."],
    ["CLASSROOM_QUOTA_EXCEEDED", "Le quota de classes de l'offre est atteint : impossible de créer une nouvelle classe."],
    ["SCHOOL_OFFER_EXPIRED", "L'offre de votre établissement est échue : la création de classes est bloquée."],
    ["SERVER_ERROR", "Une erreur est survenue de notre côté. Réessayez dans quelques instants."],
  ])("erreur du serveur %s affichée", async (code, text) => {
    const user = userEvent.setup();
    POST.mockResolvedValue(failure(code === "SERVER_ERROR" ? 500 : 400, code));
    render(<ClassroomForm school={school()} />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Créer la classe" }));
    expect((await screen.findAllByText(text)).length).toBeGreaterThan(0);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("erreurs de champ de l'API : nom et parcours", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(failure(400, "VALIDATION_ERROR", { name: "Nom trop long.", courseSlug: "Parcours inconnu." }));
    render(<ClassroomForm school={school()} />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Créer la classe" }));
    expect((await screen.findAllByText("Nom trop long.")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Parcours inconnu.").length).toBeGreaterThan(0);
  });

  it("quota atteint : bouton désactivé, mais l'erreur du serveur reste affichée si le formulaire est soumis", async () => {
    render(<ClassroomForm school={school({ classroomsLeft: 0, classroomsUsed: 5 })} />);
    expect(screen.getByRole("button", { name: "Créer la classe" })).toBeDisabled();
    expect(screen.getByText(/Quota de classes atteint \(5 sur 5\)/)).toBeInTheDocument();
  });

  it("offre échue : explication propre", () => {
    render(<ClassroomForm school={school({ offerExpired: true })} />);
    expect(screen.getByText(/L'offre de votre établissement est échue : impossible de créer/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Créer la classe" })).toBeDisabled();
  });

  it("une seconde soumission avant la réponse ne repart pas", async () => {
    const user = userEvent.setup();
    let finish: (value: unknown) => void = () => {};
    POST.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    render(<ClassroomForm school={school()} />);
    await fill(user);
    const form = screen.getByRole("form", { name: "Créer une classe" });
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(POST).toHaveBeenCalledTimes(1);
    await act(async () => finish({ data: classroom({ id: 7 }), response: new Response(null, { status: 201 }) }));
  });
});

describe("WT13 · ClassroomForm (édition)", () => {
  it("avec élèves : parcours figé, seul le nom et le niveau partent", async () => {
    const user = userEvent.setup();
    PATCH.mockResolvedValue({ data: classroom(), response: new Response(null, { status: 200 }) });
    render(<ClassroomForm school={school()} classroom={classroom({ schoolGrade: { id: 1, code: "4e", label: "4ᵉ" } })} />);
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.getByText(/12 élèves sont inscrits : le parcours n'est plus modifiable/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Annuler" })).toHaveAttribute("href", "/enseignant/classes/3");
    await user.clear(screen.getByLabelText(/Nom de la classe/));
    await user.type(screen.getByLabelText(/Nom de la classe/), "4ᵉ C");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() =>
      expect(PATCH).toHaveBeenCalledWith("/api/classrooms/{id}/", {
        params: { path: { id: "3" } },
        body: { name: "4ᵉ C", schoolGrade: "4e" },
      }),
    );
    expect(router.push).toHaveBeenCalledWith("/enseignant/classes/3?confirmation=modifiee");
  });

  it("un seul élève : singulier ; parcours absent de l'offre : celui de la classe est affiché", () => {
    render(
      <ClassroomForm
        school={school({ courses: [] })}
        classroom={classroom({ memberCount: 1 })}
      />,
    );
    expect(screen.getByText(/1 élève est inscrit/)).toBeInTheDocument();
    expect(screen.getByText("Robot Bluetooth")).toBeInTheDocument();
  });

  it("sans élève : parcours modifiable, envoyé avec le reste", async () => {
    const user = userEvent.setup();
    PATCH.mockResolvedValue({ data: classroom(), response: new Response(null, { status: 200 }) });
    render(<ClassroomForm school={school()} classroom={classroom({ hasMembers: false, memberCount: 0 })} />);
    expect(screen.getByRole("radio", { name: /Robot Bluetooth/ })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: /Initiation à Scratch/ }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(PATCH).toHaveBeenCalled());
    expect(PATCH.mock.calls[0][1].body).toEqual({ name: "4ᵉ B · Robotique", courseSlug: "scratch", schoolGrade: null });
  });

  it("l'édition n'est pas bloquée par le quota de classes", () => {
    render(<ClassroomForm school={school({ classroomsLeft: 0 })} classroom={classroom()} />);
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
  });
});

describe("WT13 · écrans serveur", () => {
  it("création : lit l'école, fil d'Ariane", async () => {
    GET.mockResolvedValue(respond(200, school()));
    render(await NewClassroom());
    expect(screen.getByRole("navigation", { name: "Fil d'Ariane" })).toHaveTextContent("Mes classes›Créer une classe");
    GET.mockResolvedValue(respond(401));
    expect(await NewClassroom()).toBeNull();
  });

  it("édition : lit la classe et l'école ; classe d'un autre enseignant → 404", async () => {
    GET.mockImplementation(async (path: string) =>
      path.includes("school") ? respond(200, school()) : respond(200, classroom()),
    );
    render(await EditClassroom({ params: Promise.resolve({ id: "3" }) }));
    expect(screen.getByRole("navigation", { name: "Fil d'Ariane" })).toHaveTextContent("Mes classes›4ᵉ B · Robotique›Modifier");
    GET.mockResolvedValue(respond(404));
    await expect(EditClassroom({ params: Promise.resolve({ id: "9" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    GET.mockResolvedValue(respond(401));
    expect(await EditClassroom({ params: Promise.resolve({ id: "3" }) })).toBeNull();
  });

  it("squelette accessible", async () => {
    const { container } = render(<ClassroomFormSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement du formulaire…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("WT04 · lignes", () => {
  it("élève actif : activité, progression et lien vers son profil", async () => {
    const { container } = render(<MemberRow member={member({ isDropout: true })} classroomId={3} />);
    expect(screen.getByRole("link", { name: /Yao Kpadé/ })).toHaveAttribute("href", "/enseignant/eleves/21?classe=3");
    expect(screen.getByText("Décrochage")).toBeInTheDocument();
    expect(screen.getByText(/Dernière activité 10 octobre 2026/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Progression : Yao Kpadé" })).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByRole("button", { name: /Retirer de la classe/ })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("élève sans activité ni progression ni profil", () => {
    render(<MemberRow member={member({ lastActivityAt: null, progressPct: null, learner: null })} classroomId={3} />);
    expect(screen.getByText("Pas encore d'activité")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("invitation en attente, refusée, expirée", async () => {
    expect(invitationLabel({ invitationStatus: "refused" })).toBe("Refusée");
    expect(invitationLabel({ invitationStatus: "expired" })).toBe("Expirée");
    expect(invitationLabel({ invitationStatus: "pending" })).toBe("En attente du parent");
    expect(invitationLabel({ invitationStatus: null })).toBe("En attente du parent");
    const { container, unmount } = render(<InvitationRow member={invitation()} classroomId={3} />);
    expect(screen.getByText("En attente du parent")).toBeInTheDocument();
    expect(screen.getByText(/expire le 30 octobre 2026/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Annuler l'invitation/ })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    unmount();
    const refused = render(<InvitationRow member={invitation({ invitationStatus: "refused" })} classroomId={3} />);
    expect(screen.getByText("Refusée")).toBeInTheDocument();
    expect(screen.queryByText(/expire le/)).toBeNull();
    refused.unmount();
    render(<InvitationRow member={invitation({ invitationStatus: "expired", invitationExpiresAt: null })} classroomId={3} />);
    expect(screen.getByText("Expirée")).toBeInTheDocument();
  });

  it("pending sans date d'expiration", () => {
    render(<InvitationRow member={invitation({ invitationExpiresAt: null })} classroomId={3} />);
    expect(screen.queryByText(/expire le/)).toBeNull();
  });
});

describe("WT04 · élèves d'une classe", () => {
  const cl = classroom({ schoolGrade: { id: 1, code: "4e", label: "4ᵉ" } });

  it("fil, actions, élèves puis invitations (le téléphone n'apparaît jamais)", async () => {
    const { container } = render(
      <ClassroomMembersView classroom={cl} members={[member(), invitation(), member({ id: 60, status: "left" })]} blocked={false} />,
    );
    expect(screen.getByRole("navigation", { name: "Fil d'Ariane" })).toHaveTextContent("Mes classes›4ᵉ B · Robotique");
    expect(screen.getByRole("heading", { level: 2, name: "4ᵉ B · Robotique" })).toBeInTheDocument();
    expect(screen.getByText("Robot Bluetooth · 4ᵉ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Modifier" })).toHaveAttribute("href", "/enseignant/classes/3/modifier");
    expect(screen.getByRole("link", { name: "Ajouter des élèves" })).toHaveAttribute("href", "/enseignant/eleves/ajouter?classe=3");
    expect(within(screen.getByRole("list", { name: "Élèves de la classe" })).getAllByRole("listitem")).toHaveLength(1);
    expect(within(screen.getByRole("list", { name: "Invitations" })).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 3, name: "Élèves (1)" })).toHaveAttribute("tabindex", "-1");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sans niveau scolaire", () => {
    render(<ClassroomMembersView classroom={classroom()} members={[member()]} blocked={false} />);
    expect(screen.getByText("Robot Bluetooth")).toBeInTheDocument();
  });

  it("classe vide : « Ajoutez vos premiers élèves » vers WT06 sur cette classe", async () => {
    const { container } = render(<ClassroomMembersView classroom={cl} members={[]} blocked={false} confirmation="creee" />);
    expect(screen.getByRole("heading", { level: 3, name: "Ajoutez vos premiers élèves" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Ajouter des élèves" })[1]).toHaveAttribute(
      "href",
      "/enseignant/eleves/ajouter?classe=3",
    );
    expect(screen.getByText("La classe est créée.")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("seulement des invitations : aucun élève actif annoncé", () => {
    render(<ClassroomMembersView classroom={cl} members={[invitation()]} blocked={false} confirmation="modifiee" />);
    expect(screen.getByText(/Aucun élève actif/)).toBeInTheDocument();
    expect(screen.getByText("La classe est enregistrée.")).toBeInTheDocument();
  });

  it("offre échue : l'ajout est bloqué et expliqué, le suivi reste ouvert", () => {
    const { unmount } = render(<ClassroomMembersView classroom={cl} members={[member()]} blocked />);
    expect(screen.queryByRole("link", { name: "Ajouter des élèves" })).toBeNull();
    expect(screen.getByRole("button", { name: "Ajouter des élèves" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ajouter des élèves" })).toHaveAccessibleDescription(
      /offre de votre établissement est échue/,
    );
    expect(screen.getByRole("list", { name: "Élèves de la classe" })).toBeInTheDocument();
    unmount();
    render(<EmptyClassroom classroom={cl} blocked />);
    expect(screen.getByRole("button", { name: "Ajouter des élèves" })).toBeDisabled();
  });

  it("classe vidée par un retrait : le titre de l'état vide reçoit le focus de repli", () => {
    const { rerender } = render(<ClassroomMembersView classroom={cl} members={[member()]} blocked={false} />);
    rerender(<ClassroomMembersView classroom={cl} members={[]} blocked={false} />);
    expect(screen.getByRole("heading", { level: 3, name: "Ajoutez vos premiers élèves" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("heading", { level: 3, name: "Ajoutez vos premiers élèves" })).toHaveAttribute("id", "eleves-classe");
  });

  it("serveur : classe, élèves, école et confirmation lus ; valeur inconnue ignorée ; sans session rien", async () => {
    GET.mockImplementation(async (path: string) =>
      path.includes("members") ? respond(200, { results: [member()] }) : path.includes("school") ? respond(200, school()) : respond(200, cl),
    );
    const props = { params: Promise.resolve({ id: "3" }), searchParams: Promise.resolve({ confirmation: "creee" }) };
    render(await ClassroomMembers(props));
    expect(screen.getByText("La classe est créée.")).toBeInTheDocument();
    const other = render(await ClassroomMembers({ ...props, searchParams: Promise.resolve({ confirmation: "x" }) }));
    expect(other.container.textContent).not.toContain("La classe est créée.");
    GET.mockResolvedValue(respond(404));
    await expect(ClassroomMembers(props)).rejects.toThrow("NEXT_NOT_FOUND");
    GET.mockResolvedValue(respond(401));
    expect(await ClassroomMembers(props)).toBeNull();
  });

  it("squelette accessible", async () => {
    const { container } = render(<ClassroomMembersSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de la classe…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("Retirer de la classe", () => {
  async function open(row: React.ReactElement) {
    const user = userEvent.setup();
    const view = render(
      <>
        <h3 id="eleves-classe" tabIndex={-1}>
          Élèves
        </h3>
        {row}
      </>,
    );
    await user.click(screen.getByRole("button", { name: /Retirer de la classe|Annuler l'invitation|Retirer l'invitation/ }));
    return { user, dialog: screen.getByRole("dialog"), view };
  }

  it("confirmation, puis retrait : POST, page relue et focus au titre de la liste", async () => {
    POST.mockResolvedValue({ response: new Response(null, { status: 200 }) });
    const { user, dialog, view } = await open(<MemberRow member={member()} classroomId={3} />);
    expect(dialog).toHaveTextContent(/place est libérée dans le quota/);
    await user.click(within(dialog).getByRole("button", { name: "Retirer de la classe" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/api/classrooms/{id}/members/{member_id}/remove/", {
        params: { path: { id: "3", member_id: "51" } },
      }),
    );
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).toBeNull();
    // La page relue ne contient plus la ligne : elle disparaît et le focus passe au titre de la liste
    view.rerender(
      <h3 id="eleves-classe" tabIndex={-1}>
        Élèves
      </h3>,
    );
    expect(document.getElementById("eleves-classe")).toHaveFocus();
  });

  it("invitation refusée ou expirée : retirée de la liste, sans place libérée", async () => {
    POST.mockResolvedValue({ response: new Response(null, { status: 200 }) });
    const { user, dialog } = await open(<InvitationRow member={invitation({ invitationStatus: "refused" })} classroomId={3} />);
    expect(dialog).toHaveTextContent("L'invitation de Kémi Ahouandjinou est retirée de la liste.");
    expect(dialog).not.toHaveTextContent(/place est libérée/);
    await user.click(within(dialog).getByRole("button", { name: "Retirer l'invitation" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
  });

  it("invitation en attente : texte et libellé propres", async () => {
    POST.mockResolvedValue({ response: new Response(null, { status: 200 }) });
    const { user, dialog } = await open(<InvitationRow member={invitation()} classroomId={3} />);
    expect(dialog).toHaveTextContent(/L'invitation de Kémi Ahouandjinou est annulée/);
    await user.click(within(dialog).getByRole("button", { name: "Annuler l'invitation" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
  });

  it("un double clic ne retire qu'une fois", async () => {
    let finish: (value: unknown) => void = () => {};
    POST.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    const { user, dialog } = await open(<MemberRow member={member()} classroomId={3} />);
    await user.dblClick(within(dialog).getByRole("button", { name: "Retirer de la classe" }));
    expect(POST).toHaveBeenCalledTimes(1);
    await act(async () => finish({ response: new Response(null, { status: 200 }) }));
  });

  it("l'erreur reste affichée dans la fenêtre, un réessai est possible, annuler l'efface", async () => {
    POST.mockResolvedValueOnce(failure(500, "SERVER_ERROR"));
    POST.mockResolvedValueOnce({ response: new Response(null, { status: 200 }) });
    const { user, dialog } = await open(<MemberRow member={member()} classroomId={3} />);
    await user.click(within(dialog).getByRole("button", { name: "Retirer de la classe" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/Réessayez dans quelques instants/);
    expect(router.refresh).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Retirer de la classe/ }));
    expect(screen.queryByRole("alert")).toBeNull();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Retirer de la classe" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
  });

  it("sans titre de liste dans la page, le focus n'échoue pas", async () => {
    POST.mockResolvedValue({ response: new Response(null, { status: 200 }) });
    const user = userEvent.setup();
    const view = render(<MemberRow member={member()} classroomId={3} />);
    await user.click(screen.getByRole("button", { name: /Retirer de la classe/ }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Retirer de la classe" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(() => view.unmount()).not.toThrow();
  });
});
