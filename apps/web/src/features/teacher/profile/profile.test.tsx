import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";
import { attempt, followUp } from "@/test/teacher-fixtures";

const GET = vi.fn();
const POST = vi.fn();
const router = { refresh: vi.fn() };
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { getLearnerFollowUp } = await import("./api");
const { AttemptRow, quizContext } = await import("./AttemptRow");
const { COMMENT_MAX, CommentForm } = await import("./CommentForm");
const { LearnerProfile, LearnerProfileSkeleton, LearnerProfileView, averageLabel, selectedAttemptOf } = await import(
  "./LearnerProfile"
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
  router.refresh.mockReset();
});

describe("getLearnerFollowUp", () => {
  it("lit le suivi de l'élève dans la classe demandée", async () => {
    GET.mockResolvedValue(respond(200, followUp()));
    expect((await getLearnerFollowUp("21", "3"))?.progressPct).toBe(40);
    expect(GET).toHaveBeenCalledWith("/api/classrooms/learners/{id}/", {
      params: { path: { id: 21 }, query: { classroomId: 3 } },
    });
  });

  it("sans classe, ou avec une classe qui n'est pas un nombre : sans filtre", async () => {
    GET.mockResolvedValue(respond(200, followUp()));
    await getLearnerFollowUp("21");
    await getLearnerFollowUp("21", "abc");
    expect(GET.mock.calls.map((call) => call[1].params.query)).toEqual([{}, {}]);
  });

  it("élève hors de mes classes ou identifiant invalide → introuvable ; sans session → null", async () => {
    await expect(getLearnerFollowUp("abc")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(GET).not.toHaveBeenCalled();
    GET.mockResolvedValue(respond(404));
    await expect(getLearnerFollowUp("21", "3")).rejects.toThrow("NEXT_NOT_FOUND");
    GET.mockResolvedValue(respond(401));
    expect(await getLearnerFollowUp("21", "3")).toBeNull();
  });
});

describe("AttemptRow", () => {
  it("contexte du quiz : niveau, sinon projet", () => {
    expect(quizContext(attempt().quiz)).toBe("Niveau 2");
    expect(quizContext(attempt({ quiz: { ...attempt().quiz, levelTitle: null } }).quiz)).toBe("Robot suiveur");
  });

  it("tentative échouée non commentée : statut et score du serveur, « Commenter » présélectionne la tentative", async () => {
    const { container } = render(<AttemptRow attempt={attempt()} learnerId={21} classroomId={3} selected />);
    expect(screen.getByText("Échoué")).toBeInTheDocument();
    expect(screen.getByText("33 %")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Commenter\s*la tentative « Quiz du niveau 2 »/ })).toHaveAttribute(
      "href",
      "/enseignant/eleves/21?classe=3&tentative=90",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("tentative commentée : badge, plus de lien ; aucune action de correction", () => {
    render(<AttemptRow attempt={attempt({ commented: true })} learnerId={21} classroomId={3} selected={false} />);
    expect(screen.getByText("Commentée")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("CommentForm", () => {
  const attempts = [attempt(), attempt({ id: 91, quiz: { ...attempt().quiz, id: 6, title: "Évaluation du projet" } })];
  const renderForm = (defaultAttemptId?: number) =>
    render(<CommentForm learnerId={21} classroomId={3} attempts={attempts} defaultAttemptId={defaultAttemptId} />);

  it("mention de visibilité, compteur, tentative présélectionnée, aucun « Message au parent »", async () => {
    const { container } = renderForm(91);
    expect(screen.getByText(/Visible par l'élève et son parent, qui en sont notifiés/)).toBeInTheDocument();
    expect(screen.getByText(`0 / ${COMMENT_MAX}`)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /À propos de la tentative/ })).toHaveValue("91");
    expect(screen.queryByText(/Message au parent/)).toBeNull();
    expect(screen.getByRole("textbox", { name: /Commentaire/ })).toHaveAttribute("maxlength", String(COMMENT_MAX));
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sans tentative : pas de sélecteur", () => {
    render(<CommentForm learnerId={21} classroomId={3} attempts={[]} />);
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("commentaire vide : erreur, focus au champ, aucun appel", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByRole("textbox", { name: /Commentaire/ }), "   ");
    await user.click(screen.getByRole("button", { name: "Envoyer le commentaire" }));
    expect(await screen.findByText("Écrivez votre commentaire.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Commentaire/ })).toHaveFocus();
    expect(POST).not.toHaveBeenCalled();
  });

  it("envoie le commentaire rattaché à la tentative, vide le champ, relit la page et rend le focus", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue({ data: { id: 6 }, response: new Response(null, { status: 201 }) });
    renderForm(90);
    await user.type(screen.getByRole("textbox", { name: /Commentaire/ }), "Revoyez le moteur.");
    await user.click(screen.getByRole("button", { name: "Envoyer le commentaire" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/api/classrooms/learners/{id}/comments/", {
        params: { path: { id: 21 } },
        body: { body: "Revoyez le moteur.", attemptId: 90, classroomId: 3 },
      }),
    );
    expect(router.refresh).toHaveBeenCalled();
    expect(await screen.findByText("Commentaire envoyé.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Commentaire/ })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: /Commentaire/ })).toHaveFocus();
    expect(screen.getByRole("combobox", { name: /À propos de la tentative/ })).toHaveValue("");
  });

  it("choisit une tentative dans la liste", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue({ data: { id: 6 }, response: new Response(null, { status: 201 }) });
    renderForm();
    await user.selectOptions(screen.getByRole("combobox", { name: /À propos de la tentative/ }), "91");
    await user.type(screen.getByRole("textbox", { name: /Commentaire/ }), "Bravo");
    await user.click(screen.getByRole("button", { name: "Envoyer le commentaire" }));
    await waitFor(() => expect(POST).toHaveBeenCalled());
    expect(POST.mock.calls[0][1].body.attemptId).toBe(91);
  });

  it("sans tentative choisie : attemptId nul", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue({ data: { id: 6 }, response: new Response(null, { status: 201 }) });
    renderForm();
    await user.type(screen.getByRole("textbox", { name: /Commentaire/ }), "Bravo");
    await user.click(screen.getByRole("button", { name: "Envoyer le commentaire" }));
    await waitFor(() => expect(POST).toHaveBeenCalled());
    expect(POST.mock.calls[0][1].body.attemptId).toBeNull();
  });

  it("erreur du serveur : le texte est conservé, l'erreur reste affichée, un réessai est possible", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValueOnce(failure(500, "SERVER_ERROR"));
    POST.mockResolvedValueOnce({ data: { id: 6 }, response: new Response(null, { status: 201 }) });
    renderForm();
    await user.type(screen.getByRole("textbox", { name: /Commentaire/ }), "Bravo");
    await user.click(screen.getByRole("button", { name: "Envoyer le commentaire" }));
    expect((await screen.findAllByText(/Réessayez dans quelques instants/)).length).toBeGreaterThan(0);
    expect(screen.getByRole("textbox", { name: /Commentaire/ })).toHaveValue("Bravo");
    expect(screen.queryByText("Commentaire envoyé.")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Envoyer le commentaire" }));
    expect(await screen.findByText("Commentaire envoyé.")).toBeInTheDocument();
    expect(POST).toHaveBeenCalledTimes(2);
  });

  it("erreur de champ de l'API : son message", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(failure(400, "VALIDATION_ERROR", { body: "Commentaire trop long." }));
    renderForm();
    await user.type(screen.getByRole("textbox", { name: /Commentaire/ }), "x");
    await user.click(screen.getByRole("button", { name: "Envoyer le commentaire" }));
    expect((await screen.findAllByText("Commentaire trop long.")).length).toBeGreaterThan(0);
  });

  it("une seconde soumission avant la réponse ne repart pas", async () => {
    const user = userEvent.setup();
    let finish: (value: unknown) => void = () => {};
    POST.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    renderForm();
    await user.type(screen.getByRole("textbox", { name: /Commentaire/ }), "Bravo");
    const form = screen.getByRole("form", { name: "Commenter" });
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(POST).toHaveBeenCalledTimes(1);
    await act(async () => finish({ data: { id: 6 }, response: new Response(null, { status: 201 }) }));
  });
});

describe("WT05 · profil de l'élève", () => {
  it("libellé de la moyenne et tentative présélectionnée", () => {
    expect(averageLabel(null)).toBe("—");
    expect(averageLabel(55)).toBe("55 %");
    const attempts = [attempt(), attempt({ id: 91 })];
    expect(selectedAttemptOf(attempts, "91")).toBe(91);
    expect(selectedAttemptOf(attempts, ["90", "91"])).toBe(90);
    expect(selectedAttemptOf(attempts, "999")).toBeUndefined();
    expect(selectedAttemptOf(attempts, undefined)).toBeUndefined();
  });

  it("fil d'Ariane, progression, tentatives, carte de l'élève, badges, commentaires ; aucune donnée sensible", async () => {
    const { container } = render(<LearnerProfileView followUp={followUp()} selectedAttempt={90} />);
    expect(screen.getByRole("navigation", { name: "Fil d'Ariane" })).toHaveTextContent(
      "Mes classes›4ᵉ B · Robotique›Yao Kpadé",
    );
    expect(screen.getByRole("heading", { level: 2, name: "Progression sur Robot Bluetooth" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Progression de Yao Kpadé" })).toHaveAttribute("aria-valuenow", "40");
    expect(within(screen.getByRole("list", { name: "Tentatives de l'élève" })).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("55 %")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Électricien" })).toBeInTheDocument();
    expect(within(screen.getByRole("complementary", { name: "Élève" })).getByRole("link", { name: "4ᵉ B · Robotique" })).toHaveAttribute(
      "href",
      "/enseignant/classes/3",
    );
    const history = within(screen.getByRole("list", { name: "Commentaires envoyés" }));
    expect(history.getByText(/Bon début !/)).toBeInTheDocument();
    expect(history.getByText(/Évaluation du projet \(Robot suiveur\)/)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /À propos de la tentative/ })).toHaveValue("90");
    expect(screen.queryByText(/\d+ ans|téléphone|Message au parent|naissance|handicap/i)).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("états vides : aucune tentative, aucun badge, aucun commentaire ; élève en décrochage", () => {
    render(
      <LearnerProfileView
        followUp={followUp({
          attempts: [],
          badges: [],
          comments: [],
          averagePercentage: null,
          isDropout: true,
          learner: { ...followUp().learner, avatar: null },
        })}
      />,
    );
    expect(screen.getByText(/Aucune tentative de quiz sur ce parcours/)).toBeInTheDocument();
    expect(screen.getByText(/Aucun badge obtenu/)).toBeInTheDocument();
    expect(screen.getByText(/Aucun commentaire envoyé/)).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("Décrochage")).toBeInTheDocument();
  });

  it("un commentaire sans tentative connue n'affiche que sa date", () => {
    render(
      <LearnerProfileView
        followUp={followUp({ comments: [{ id: 7, body: "Courage", attemptId: null, createdAt: "2026-10-21T10:00:00Z" }] })}
      />,
    );
    const item = within(screen.getByRole("list", { name: "Commentaires envoyés" })).getByRole("listitem");
    expect(item).toHaveTextContent("21 octobre 2026");
    expect(item).not.toHaveTextContent("·");
  });

  it("serveur : lit le suivi avec la classe et la tentative de l'URL ; sans session rien ; hors classes → 404", async () => {
    GET.mockResolvedValue(respond(200, followUp()));
    const props = {
      params: Promise.resolve({ id: "21" }),
      searchParams: Promise.resolve({ classe: ["3"], tentative: "90" }),
    };
    render(await LearnerProfile(props));
    expect(GET.mock.calls[0][1].params.query).toEqual({ classroomId: 3 });
    expect(screen.getByRole("combobox", { name: /À propos de la tentative/ })).toHaveValue("90");
    await LearnerProfile({ params: Promise.resolve({ id: "21" }), searchParams: Promise.resolve({ classe: "3" }) });
    GET.mockResolvedValue(respond(401));
    expect(await LearnerProfile(props)).toBeNull();
    GET.mockResolvedValue(respond(404));
    await expect(LearnerProfile(props)).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("squelette accessible", async () => {
    const { container } = render(<LearnerProfileSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement du profil…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
