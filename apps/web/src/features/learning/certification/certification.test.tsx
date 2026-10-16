import { act, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { COURSE } from "@/test/api-fixtures";
import { CERTIFICATE, failure, learnerBadge, ok, tree } from "@/test/learning-fixtures";

const GET = vi.fn();
const getCurrentUser = vi.fn();
const apiCall = vi.fn();
const features = { unlock: false, events: false };
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock("@/lib/features", () => ({ features }));
vi.mock("@/lib/api-call", () => ({ apiCall: (request: unknown) => apiCall(request) }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
}));

const { CertificationView, remainingLabel } = await import("./CertificationView");
const { CertificateDownload, PDF_POLL_MS } = await import("./CertificateDownload");
const { default: CertificationPage } = await import("@/app/(apprenant)/apprenant/(shell)/parcours/[slug]/certification/page");

const certified = (overrides: Partial<ReturnType<typeof tree>["certification"]> = {}) =>
  tree({
    status: "completed",
    certification: {
      ...tree().certification,
      eligible: true,
      missionsDone: 8,
      summativesPassed: 2,
      certificate: CERTIFICATE,
      eventTicket: true,
      ...overrides,
    },
  });

function mockApi(data: unknown, { badges = [learnerBadge({ kind: "project", label: "Pilote" })], recos = [COURSE] } = {}) {
  GET.mockImplementation(async (path: string) => {
    if (path === "/api/learning/badges/") return ok({ count: badges.length, results: badges });
    if (path === "/api/learning/recommendations/") return ok(recos);
    return data;
  });
}

beforeEach(() => {
  GET.mockReset();
  getCurrentUser.mockReset();
  getCurrentUser.mockResolvedValue({ firstName: "Léa", lastName: "Adjovi" });
  features.events = false;
});

describe("CertificationView (WJ07 / WJ09)", () => {
  it("WJ07 : certificat de l'API, nom, mois, badges de projet, PDF prêt, recommandations", async () => {
    mockApi(ok(certified()));
    render((await CertificationView({ slug: "robot-bluetooth" })) as ReactElement);
    expect(screen.getByRole("heading", { level: 2, name: "Construis ton robot Bluetooth" })).toBeInTheDocument();
    expect(screen.getByText("Léa Adjovi")).toBeInTheDocument();
    expect(screen.getByText(/septembre 2026 · n° CERT-2026-000007/)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Badges de projet" })).toHaveTextContent("Pilote");
    expect(screen.getByRole("link", { name: /Télécharger la certification \(PDF\)/ })).toHaveAttribute(
      "href",
      expect.stringMatching(/\/api\/learning\/certificates\/7\/download\/$/),
    );
    expect(screen.getByRole("heading", { name: "Continue ton aventure" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Découverte de la robotique/ })).toHaveAttribute(
      "href",
      "/apprenant/catalogue/decouverte-robotique",
    );
    // Ticket Steamy Events derrière le drapeau `events` (étape 3.8)
    expect(screen.queryByText(/Ticket Steamy Events/)).not.toBeInTheDocument();
  });

  it("ticket affiché une fois les événements livrés ; sans badge, sans recommandation, sans session lisible", async () => {
    features.events = true;
    getCurrentUser.mockResolvedValue(null);
    mockApi(ok(certified()), { badges: [], recos: [] });
    GET.mockImplementation(async (path: string) => {
      if (path === "/api/learning/badges/") return failure(500);
      if (path === "/api/learning/recommendations/") return failure(500);
      return ok(certified());
    });
    render((await CertificationView({ slug: "robot-bluetooth" })) as ReactElement);
    expect(screen.getByRole("link", { name: "Voir les événements" })).toHaveAttribute("href", "/apprenant/evenements");
    expect(screen.queryByText("Léa Adjovi")).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Badges de projet" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Continue ton aventure" })).not.toBeInTheDocument();
  });

  it("WJ09 : ce qu'il reste, la liste des projets, reprise ; aucun envoi au parent", async () => {
    mockApi(ok(tree()));
    render((await CertificationView({ slug: "robot-bluetooth" })) as ReactElement);
    expect(screen.getByRole("heading", { name: "Encore un effort !" })).toBeInTheDocument();
    expect(screen.getByText(/Il te reste 2 projets pour obtenir ta certification/)).toBeInTheDocument();
    expect(screen.getByText("5/8 missions · 1/2 évaluations réussies")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Projet 2/ })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("link", { name: /Continuer le projet 2/ })).toHaveAttribute(
      "href",
      "/apprenant/parcours/robot-bluetooth/missions/12",
    );
    expect(screen.queryByText(/parent/)).not.toBeInTheDocument();
  });

  it("WJ09 dans le dernier projet : missions restantes ; étape suivante = certification en préparation", async () => {
    const last = tree({ currentProject: null, next: { ...tree().next, type: "certification", id: null, projectId: null } });
    last.projects = last.projects.map((p) => ({ ...p, state: p.id === 2 ? ("available" as const) : ("done" as const) }));
    mockApi(ok(last));
    render((await CertificationView({ slug: "robot-bluetooth" })) as ReactElement);
    expect(screen.getByText(/Il te reste 3 missions/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Continuer/ })).not.toBeInTheDocument();
  });

  it("libellés du reste à faire", () => {
    const base = tree();
    const done = { ...base, projects: base.projects.map((p) => ({ ...p, state: "done" as const })) };
    expect(remainingLabel({ ...done, certification: { ...base.certification, missionsDone: 8 } })).toBe("0 projet");
    const one = { ...done, projects: [{ ...done.projects[0], state: "available" as const }] };
    expect(remainingLabel({ ...one, certification: { ...base.certification, missionsDone: 7 } })).toBe("1 mission");
  });

  it("reprise sans projet courant", async () => {
    mockApi(ok(tree({ currentProject: null })));
    render((await CertificationView({ slug: "robot-bluetooth" })) as ReactElement);
    expect(screen.getByRole("link", { name: /Continuer mon parcours/ })).toBeInTheDocument();
  });

  it("parcours sans certification, ou non suivi", async () => {
    mockApi(ok(tree({ certification: { ...tree().certification, certificateEnabled: false } })));
    const { unmount } = render((await CertificationView({ slug: "robot-bluetooth" })) as ReactElement);
    expect(screen.getByText("Ce parcours ne délivre pas de certification.")).toBeInTheDocument();
    unmount();
    mockApi(failure(403, "NOT_ENROLLED"));
    render((await CertificationView({ slug: "robot-bluetooth" })) as ReactElement);
    expect(screen.getByRole("heading", { name: "Ce contenu n'est pas encore ouvert" })).toBeInTheDocument();
  });

  it("la page passe le parcours de l'URL", async () => {
    const tree = (await CertificationPage({ params: Promise.resolve({ slug: "robot" }) } as never)) as ReactElement<{
      children: ReactElement<{ slug: string }>;
    }>;
    expect(tree.props.children.props.slug).toBe("robot");
  });
});

describe("CertificateDownload (D33)", () => {
  afterEach(() => vi.useRealTimers());

  it("« Préparation… » puis téléchargement quand l'API répond `ready`", async () => {
    vi.useFakeTimers();
    apiCall.mockResolvedValueOnce({ ok: true, data: { results: [{ ...CERTIFICATE, pdfStatus: "pending" }] } });
    apiCall.mockResolvedValueOnce({ ok: false, code: "NETWORK_UNAVAILABLE" });
    apiCall.mockResolvedValueOnce({ ok: true, data: { results: [] } });
    apiCall.mockResolvedValueOnce({ ok: true, data: { results: [CERTIFICATE] } });
    render(<CertificateDownload certificateId={7} status="pending" downloadUrl="/dl/7" />);
    expect(screen.getByRole("button", { name: /Préparation…/ })).toBeDisabled();
    for (let i = 0; i < 4; i += 1) await act(async () => vi.advanceTimersByTime(PDF_POLL_MS));
    expect(screen.getByRole("link", { name: /Télécharger la certification/ })).toHaveAttribute("href", "/dl/7");
    const GET = vi.fn();
    (apiCall.mock.calls[0][0] as (api: { GET: typeof GET }) => unknown)({ GET });
    expect(GET).toHaveBeenCalledWith("/api/learning/certificates/", { params: { query: { pageSize: 100 } } });
  });

  it("échec de génération signalé", () => {
    render(<CertificateDownload certificateId={7} status="failed" downloadUrl="/dl/7" />);
    expect(screen.getByRole("alert")).toHaveTextContent("La création du PDF a échoué");
  });
});
