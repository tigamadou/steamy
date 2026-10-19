import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CERTIFICATE, enrollment } from "@/test/learning-fixtures";

const push = vi.fn();
const apiCall = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api-call", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-call")>()),
  apiCall: (request: unknown) => apiCall(request),
}));

const { DoneCourseCard, EnrolledCourseCard, positionLabel } = await import("./EnrolledCourseCard");
const { InfoBlock } = await import("./InfoBlock");
const { MarkDoneButton } = await import("./MarkDoneButton");
const { MissionBlocks } = await import("./MissionBlocks");
const { TeacherCommentCard } = await import("./TeacherCommentCard");

describe("EnrolledCourseCard (WD23)", () => {
  const now = new Date("2026-10-16T10:00:00Z");

  it("carte en cours : position, prochaine mission, dernière activité, reprise", () => {
    render(<EnrolledCourseCard enrollment={enrollment()} now={now} />);
    expect(screen.getByRole("link", { name: "Construis ton robot Bluetooth" })).toHaveAttribute(
      "href",
      "/apprenant/parcours/robot-bluetooth",
    );
    expect(screen.getByText("Intermédiaire")).toBeInTheDocument();
    expect(screen.getByText("· Projet 2 · Niveau 1")).toBeInTheDocument();
    expect(screen.getByText("Servo-moteur")).toBeInTheDocument();
    expect(screen.getByText("🕒 Dernière activité : Hier")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Continuer/ })).toHaveAttribute(
      "href",
      "/apprenant/parcours/robot-bluetooth/missions/12",
    );
    expect(screen.queryByText("Avec ta classe")).not.toBeInTheDocument();
  });

  it("inscription par la classe, sans activité ni position, prochaine étape = quiz", () => {
    render(
      <EnrolledCourseCard
        enrollment={enrollment({
          source: "classroom",
          lastActivityAt: null,
          currentProject: null,
          currentLevel: null,
          course: { ...enrollment().course, emoji: "" },
          next: { ...enrollment().next, type: "quiz", id: 201 },
        })}
      />,
    );
    expect(screen.getByText("Avec ta classe")).toBeInTheDocument();
    expect(screen.queryByText(/Dernière activité/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Prochaine mission/)).not.toBeInTheDocument();
    expect(screen.getByText("🤖")).toBeInTheDocument();
  });

  it("position partielle", () => {
    expect(positionLabel({ currentProject: { id: 1, order: 2, title: "" }, currentLevel: null })).toBe("Projet 3");
  });

  it("carte terminée : certificat, téléchargement si prêt", () => {
    const done = enrollment({ status: "completed", progressPct: 100 });
    const { rerender } = render(<DoneCourseCard enrollment={done} certificate={CERTIFICATE} downloadUrl="/dl/7" />);
    expect(screen.getByText("Terminé · 100 %")).toBeInTheDocument();
    expect(screen.getByText(/Certifié le 3 sept\. 2026 · certificat n° CERT-2026-000007/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Télécharger la certification/ })).toHaveAttribute("href", "/dl/7");
    rerender(<DoneCourseCard enrollment={done} certificate={null} />);
    expect(screen.queryByText(/Certifié le/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Télécharger/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir ma certification ›" })).toHaveAttribute(
      "href",
      "/apprenant/parcours/robot-bluetooth/certification",
    );
  });
});

describe("blocs de contenu", () => {
  it("InfoBlock absent sans élément", () => {
    const { container, rerender } = render(<InfoBlock emoji="🧰" title="Matériel" items={[]} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<InfoBlock emoji="🧰" title="Matériel" items={["Un servo"]} />);
    expect(screen.getByRole("heading", { name: /Matériel/ })).toBeInTheDocument();
  });

  it("MissionBlocks : média sans texte alternatif ni légende", () => {
    const { container } = render(<MissionBlocks blocks={[{ type: "media", src: "/a.png" }]} />);
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
    expect(container.querySelector("figcaption")).toBeNull();
  });

  it("TeacherCommentCard : absente sans commentaire, sinon les mots de l'enseignant", () => {
    const { container, rerender } = render(<TeacherCommentCard comments={[]} />);
    expect(container).toBeEmptyDOMElement();
    rerender(
      <TeacherCommentCard comments={[{ id: 1, author: "M. Koffi", message: "Bravo Léa !", createdAt: "2026-10-14T09:00:00Z" }]} />,
    );
    expect(screen.getByRole("heading", { name: /Mot de ton enseignant/ })).toBeInTheDocument();
    expect(screen.getByText("M. Koffi · 14 octobre 2026")).toBeInTheDocument();
  });
});

describe("MarkDoneButton (WJ03)", () => {
  beforeEach(() => {
    push.mockReset();
    apiCall.mockReset();
  });

  it("termine la mission puis suit l'étape suivante renvoyée par l'API", async () => {
    const user = userEvent.setup();
    apiCall.mockResolvedValue({
      ok: true,
      data: { missionId: 12, progressPct: 70, pointsEarned: 0, next: { ...enrollment().next, type: "quiz", id: 201 } },
    });
    render(<MarkDoneButton missionId={12} />);
    await user.click(screen.getByRole("button", { name: /Marquer comme terminée/ }));
    expect(push).toHaveBeenCalledWith("/apprenant/parcours/robot-bluetooth/quiz/201");
    const POST = vi.fn();
    (apiCall.mock.calls[0][0] as (api: { POST: typeof POST }) => unknown)({ POST });
    expect(POST).toHaveBeenCalledWith("/api/learning/missions/{id}/complete/", { params: { path: { id: 12 } } });
  });

  it("mission verrouillée ou erreur réseau : message, pas de navigation", async () => {
    const user = userEvent.setup();
    apiCall.mockResolvedValue({ ok: false, code: "CONTENT_LOCKED", message: "", fields: {} });
    render(<MarkDoneButton missionId={14} />);
    await user.click(screen.getByRole("button", { name: /Marquer comme terminée/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("Cette mission n'est pas encore ouverte");
    apiCall.mockResolvedValue({ ok: false, code: "NETWORK_UNAVAILABLE", message: "", fields: {} });
    await user.click(screen.getByRole("button", { name: /Marquer comme terminée/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("Le serveur est injoignable");
    expect(push).not.toHaveBeenCalled();
  });
});
