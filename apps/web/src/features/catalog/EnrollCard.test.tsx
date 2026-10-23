import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { courseDetail, KIT } from "@/test/api-fixtures";
import { axe } from "@/test/axe";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const enroll = vi.fn();
const addToWishlist = vi.fn();
const removeFromWishlist = vi.fn();
vi.mock("./api", async (original) => ({
  ...(await original<typeof import("./api")>()),
  enroll,
  addToWishlist,
  removeFromWishlist,
}));
const createPaymentRequest = vi.fn();
vi.mock("@/features/unlock/api", () => ({ createPaymentRequest }));

const { EnrollCard } = await import("./EnrollCard");

const FREE = courseDetail();
const PAID = courseDetail({ slug: "capteurs", isFree: false, price: 18000, prerequisites: [] });
const WITH_KIT = courseDetail({
  slug: "robot-bluetooth",
  isFree: false,
  price: 25000,
  requiredKit: { slug: "steamy-bot-v1", name: "Steamy Bot v1" },
  durationHours: 0,
  certificateEnabled: false,
});
const KIT_DETAIL = { ...KIT, description: "", compatibleCourses: [] };

beforeEach(() => {
  push.mockReset();
  enroll.mockReset();
  createPaymentRequest.mockReset();
});

describe("EnrollCard · WC04 gratuit", () => {
  it("« Commencer le parcours » inscrit puis ouvre WJ01 du premier projet", async () => {
    const user = userEvent.setup();
    enroll.mockResolvedValue({ ok: true, data: { currentProject: { id: 7, order: 0, title: "P1" } } });
    const { container } = render(<EnrollCard course={FREE} wished={false} kit={null} />);
    expect(screen.getByText("Gratuit · accès complet")).toBeInTheDocument();
    expect(screen.getByText("4 h de contenu")).toBeInTheDocument();
    expect(screen.getByText("2 projets · 2 niveaux")).toBeInTheDocument();
    expect(screen.getByText("3 missions")).toBeInTheDocument();
    expect(screen.getByText("Certificat à la fin")).toBeInTheDocument();
    expect(screen.getByText("Savoir lire")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole("button", { name: "Commencer le parcours" }));
    expect(enroll).toHaveBeenCalledWith("initiation-scratch");
    expect(push).toHaveBeenCalledWith("/apprenant/parcours/initiation-scratch/projets/7");
  });

  it("sans projet courant, ouvre l'arbre du parcours", async () => {
    const user = userEvent.setup();
    enroll.mockResolvedValue({ ok: true, data: { currentProject: null } });
    render(<EnrollCard course={FREE} wished={false} kit={null} />);
    await user.click(screen.getByRole("button", { name: "Commencer le parcours" }));
    expect(push).toHaveBeenCalledWith("/apprenant/parcours/initiation-scratch");
  });

  it.each([
    ["PAYMENT_REQUIRED", "Ce parcours est payant : ton parent doit le régler."],
    ["KIT_CODE_REQUIRED", "Ce parcours s'obtient avec un Kit Code."],
  ])("erreur %s affichée telle que l'API la renvoie", async (code, message) => {
    const user = userEvent.setup();
    enroll.mockResolvedValue({ ok: false, code, message, fields: {} });
    render(<EnrollCard course={FREE} wished={false} kit={null} />);
    await user.click(screen.getByRole("button", { name: "Commencer le parcours" }));
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("button", { name: "Commencer le parcours" })).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });

  it("déjà inscrit : progression et « Continuer » vers WC06a", () => {
    render(<EnrollCard course={FREE} progress={35} wished={false} kit={null} />);
    expect(screen.getByRole("progressbar", { name: "Ta progression" })).toHaveAttribute("aria-valuenow", "35");
    expect(screen.getByRole("link", { name: "Continuer" })).toHaveAttribute(
      "href",
      "/apprenant/parcours/initiation-scratch",
    );
    expect(screen.queryByRole("button", { name: "Commencer le parcours" })).not.toBeInTheDocument();
  });

  it("souhaits : bouton bascule", async () => {
    const user = userEvent.setup();
    removeFromWishlist.mockResolvedValue({ ok: true, data: undefined });
    render(<EnrollCard course={FREE} wished kit={null} />);
    const button = screen.getByRole("button", { name: "Dans tes souhaits" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    await user.click(button);
    expect(screen.getByRole("button", { name: "Ajouter aux souhaits" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("status")).toHaveTextContent("Parcours retiré des souhaits");
  });
});

describe("EnrollCard · WC05", () => {
  it("payant sans kit : prix de l'API ; « Demander à mon parent » crée la demande puis ouvre WA02", async () => {
    const user = userEvent.setup();
    createPaymentRequest.mockResolvedValue({ ok: true, data: { id: 12 } });
    render(<EnrollCard course={PAID} wished={false} kit={null} />);
    expect(screen.getByText(/18\s000 F CFA/)).toBeInTheDocument();
    expect(screen.getByText("Payé par ton parent · accès à vie")).toBeInTheDocument();
    expect(screen.queryByText(/Bientôt|Acheter/)).not.toBeInTheDocument();
    expect(screen.queryByText("Prérequis")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Demander à mon parent" }));
    expect(createPaymentRequest).toHaveBeenCalledWith({ kind: "course", courseSlug: "capteurs" });
    expect(push).toHaveBeenCalledWith("/apprenant/demandes/12");
  });

  it.each([
    [{ courseSlug: "Tu suis déjà ce parcours." }, "", "Tu suis déjà ce parcours."],
    [{}, "Action non autorisée.", "Action non autorisée."],
  ])("demande refusée par l'API : message du champ, sinon de l'API", async (fields, message, shown) => {
    const user = userEvent.setup();
    createPaymentRequest.mockResolvedValue({ ok: false, code: "VALIDATION_ERROR", message, fields });
    render(<EnrollCard course={PAID} wished={false} kit={null} />);
    await user.click(screen.getByRole("button", { name: "Demander à mon parent" }));
    expect(screen.getByRole("alert")).toHaveTextContent(shown);
    expect(screen.getByRole("button", { name: "Demander à mon parent" })).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });

  it("demande déjà en cours : « Demande envoyée » → WA02", () => {
    render(<EnrollCard course={PAID} wished={false} kit={null} pendingRequestId={7} />);
    expect(screen.getByRole("link", { name: "Demande envoyée" })).toHaveAttribute("href", "/apprenant/demandes/7");
    expect(screen.queryByRole("button", { name: "Demander à mon parent" })).not.toBeInTheDocument();
  });

  it("avec kit : pas de prix de parcours, « Débloqué avec le Kit Code », kit lu dans la boutique", () => {
    render(<EnrollCard course={WITH_KIT} wished={false} kit={KIT_DETAIL} />);
    expect(screen.getByText("Débloqué avec le Kit Code")).toBeInTheDocument();
    expect(screen.queryByText(/25\s000/)).not.toBeInTheDocument();
    expect(screen.getByText("Kit requis")).toBeInTheDocument();
    expect(screen.getByText(/35\s000 F CFA HT · En stock/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "J'ai un Kit Code" })).toHaveAttribute(
      "href",
      "/apprenant/catalogue/robot-bluetooth/kit-code",
    );
    expect(screen.getByRole("link", { name: /Voir le kit/ })).toHaveAttribute(
      "href",
      `/apprenant/boutique/${KIT_DETAIL.slug}`,
    );
    expect(screen.queryByText(/h de contenu|Certificat/)).not.toBeInTheDocument();
  });

  it("avec kit retiré de la vente : pas de bloc « Kit requis »", () => {
    render(<EnrollCard course={WITH_KIT} wished={false} kit={null} />);
    expect(screen.queryByText("Kit requis")).not.toBeInTheDocument();
  });

  it("kit sans emoji : icône de la catégorie", () => {
    render(<EnrollCard course={WITH_KIT} wished={false} kit={{ ...KIT_DETAIL, emoji: "" }} />);
    expect(screen.getByText("Kit requis")).toBeInTheDocument();
  });
});
