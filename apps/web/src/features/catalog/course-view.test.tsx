import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { courseDetail, KIT } from "@/test/api-fixtures";

vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
const getCourse = vi.fn();
vi.mock("@/lib/catalog", () => ({ getCourse }));
const getKit = vi.fn();
vi.mock("@/lib/shop", () => ({ getKit }));
const getLearnerCourseState = vi.fn();
vi.mock("./learner-state", () => ({ getLearnerCourseState }));
const getPendingRequests = vi.fn(async () => [] as unknown[]);
vi.mock("@/features/unlock/server", () => ({ getPendingRequests }));

const { LearnerCourseView } = await import("./course-view");
const { CourseDetailSkeleton } = await import("./course-detail");

const params = (slug: string) => Promise.resolve({ slug });

describe("WC04 / WC05 · fiche parcours de l'apprenant", () => {
  it("fil d'Ariane, titre en h2, sections en h3, programme avec durées, sans note (C8)", async () => {
    getCourse.mockResolvedValue(
      courseDetail({
        projects: [
          {
            order: 0,
            title: "Premiers blocs",
            durationHours: 2,
            levels: [{ order: 0, title: "L'interface", missions: [{ order: 0, title: "Découvrir", durationMin: 8 }] }],
          },
          { order: 1, title: "Mini-jeu", levels: [{ order: 0, title: "Le jeu", missions: [{ order: 0, title: "Fin" }] }] },
        ],
      }),
    );
    getLearnerCourseState.mockResolvedValue({ wished: ["initiation-scratch"], progress: {} });
    render(await LearnerCourseView({ params: params("initiation-scratch") }));
    expect(getKit).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Catalogue" })).toHaveAttribute("href", "/apprenant/catalogue");
    expect(screen.getByRole("link", { name: "Robotique" })).toHaveAttribute(
      "href",
      "/apprenant/catalogue?categorie=robotique",
    );
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Initiation à Scratch" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "À propos du parcours",
      "Ce que tu vas apprendre",
      "Programme · 2 projets",
      "Public visé",
    ]);
    expect(screen.getAllByText("Premiers blocs")).toHaveLength(2);
    expect(screen.getByText("2 h · 1 mission")).toBeInTheDocument();
    expect(screen.getByText("8 min")).toBeInTheDocument();
    expect(screen.getByText("Débutant")).toBeInTheDocument();
    expect(screen.queryByText(/★|note|avis|inscrits/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("Gratuit").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Dans tes souhaits" })).toBeInTheDocument();
  });

  it("bande-annonce Vimeo derrière une vignette quand l'API en fournit une", async () => {
    getCourse.mockResolvedValue(courseDetail({ trailerVimeoId: "76979871", trailerVimeoHash: "" }));
    getLearnerCourseState.mockResolvedValue({ wished: [], progress: { "initiation-scratch": 10 } });
    const { container } = render(await LearnerCourseView({ params: params("initiation-scratch") }));
    expect(
      screen.getByRole("button", { name: "Lire la bande-annonce : Bande-annonce : Initiation à Scratch" }),
    ).toBeInTheDocument();
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("link", { name: "Continuer" })).toBeInTheDocument();
  });

  it("parcours à kit : pastille Kit Code, kit lu dans la boutique, pas de prix de parcours", async () => {
    getCourse.mockResolvedValue(
      courseDetail({
        isFree: false,
        price: 25000,
        emoji: "",
        outcomes: [],
        audience: "",
        requiredKit: { slug: "steamy-bot-v1", name: "Steamy Bot v1" },
      }),
    );
    getKit.mockResolvedValue({ ...KIT, description: "", compatibleCourses: [] });
    getLearnerCourseState.mockResolvedValue({ wished: [], progress: {} });
    render(await LearnerCourseView({ params: params("robot-bluetooth") }));
    expect(getKit).toHaveBeenCalledWith("steamy-bot-v1");
    expect(screen.getByText("📦 Avec le Kit Code")).toBeInTheDocument();
    expect(screen.queryByText(/25\s000/)).not.toBeInTheDocument();
    expect(screen.queryByText("Ce que tu vas apprendre")).not.toBeInTheDocument();
  });

  it("parcours payant : prix de l'API dans l'en-tête", async () => {
    getCourse.mockResolvedValue(courseDetail({ isFree: false, price: 18000, durationHours: 0, certificateEnabled: true }));
    getLearnerCourseState.mockResolvedValue({ wished: [], progress: {} });
    render(await LearnerCourseView({ params: params("capteurs") }));
    expect(screen.getAllByText(/18\s000 F CFA/)).toHaveLength(2);
    expect(screen.getByText("📜 Certification")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Demander à mon parent" })).toBeInTheDocument();
  });

  it("parcours payant déjà demandé : « Demande envoyée » vers la demande en cours (WA02)", async () => {
    getCourse.mockResolvedValue(courseDetail({ slug: "capteurs", isFree: false, price: 18000 }));
    getLearnerCourseState.mockResolvedValue({ wished: [], progress: {} });
    getPendingRequests.mockResolvedValueOnce([
      { id: 3, course: { slug: "autre", title: "Autre" } },
      { id: 9, course: null },
      { id: 4, course: { slug: "capteurs", title: "Capteurs" } },
    ]);
    render(await LearnerCourseView({ params: params("capteurs") }));
    expect(screen.getByRole("link", { name: "Demande envoyée" })).toHaveAttribute("href", "/apprenant/demandes/4");
  });

  it("demandes illisibles : « Demander à mon parent » reste proposé", async () => {
    getCourse.mockResolvedValue(courseDetail({ slug: "capteurs", isFree: false, price: 18000 }));
    getLearnerCourseState.mockResolvedValue({ wished: [], progress: {} });
    getPendingRequests.mockRejectedValueOnce(new Error("panne"));
    render(await LearnerCourseView({ params: params("capteurs") }));
    expect(screen.getByRole("button", { name: "Demander à mon parent" })).toBeInTheDocument();
  });

  it("boutique, souhaits ou inscriptions en panne : fiche dégradée, pas d'échec", async () => {
    getCourse.mockResolvedValue(courseDetail({ isFree: false, requiredKit: { slug: "steamy-bot-v1", name: "Steamy Bot v1" } }));
    getKit.mockRejectedValue(new Error("boutique en panne"));
    getLearnerCourseState.mockResolvedValue({ wished: [], progress: {}, degraded: true });
    render(await LearnerCourseView({ params: params("robot-bluetooth") }));
    expect(screen.getAllByRole("status")[0]).toHaveTextContent(/n'ont pas pu être chargés/);
    expect(screen.getByText("Débloqué avec le Kit Code")).toBeInTheDocument();
    expect(screen.queryByText("Kit requis")).not.toBeInTheDocument();
  });

  it("parcours inconnu ou non publié → 404", async () => {
    getCourse.mockResolvedValue(null);
    await expect(LearnerCourseView({ params: params("disparu") })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("silhouette verbalisée", () => {
    render(<CourseDetailSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement du parcours…" })).toBeInTheDocument();
  });
});
