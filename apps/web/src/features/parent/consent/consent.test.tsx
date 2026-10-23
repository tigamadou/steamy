import type { Schemas } from "@steamy/api-client";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const POST = vi.fn();
const GET = vi.fn();
const router = { push: vi.fn(), refresh: vi.fn() };
const notFound = vi.fn(() => {
  throw new Error("not-found");
});
const retry = vi.fn();
const REASONS = [
  { id: 1, code: "too-young", label: "Mon enfant est trop jeune" },
  { id: 2, code: "other", label: "Autre raison" },
];
const useReferential = vi.fn(() => ({ items: REASONS, status: "ready", retry }));
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST }) }));
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("@/lib/use-referential", () => ({ useReferential }));
vi.mock("next/navigation", () => ({ useRouter: () => router, notFound }));

const { RefuseConsentDialog } = await import("./RefuseConsentDialog");
const { ConsentDecision } = await import("./ConsentDecision");
const { ConsentOrigin } = await import("./ConsentOrigin");
const { ConsentRequestScreen, ConsentRequestSkeleton, ConsentRequestView } = await import("./ConsentRequestScreen");

type ConsentRequest = Schemas["ConsentRequest"];

function consent(overrides: Partial<ConsentRequest> = {}): ConsentRequest {
  return {
    id: 9,
    origin: "learner",
    classroom: null,
    status: "pending",
    firstName: "Kemi",
    lastName: "Adjovi",
    username: "kemi.a",
    age: 13,
    relationship: { id: 1, code: "mere", label: "Mère", parentLabel: "Vous êtes sa mère" },
    createdAt: "2026-10-15T08:00:00Z",
    expiresAt: "2026-10-22T08:00:00Z",
    resolvedAt: null,
    refusalReason: null,
    refusalNote: "",
    ...overrides,
  };
}

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });

beforeEach(() => {
  POST.mockReset();
  GET.mockReset();
  router.push.mockReset();
  router.refresh.mockReset();
});

describe("RefuseConsentDialog (modale de WPD05, reprise de WP11)", () => {
  function renderDialog(onClose = vi.fn()) {
    render(<RefuseConsentDialog id={9} firstName="Kemi" open onClose={onClose} />, {
      wrapper: ({ children }) => <main>{children}</main>,
    });
    return within(screen.getByRole("dialog", { name: "Refuser la demande de Kemi ?" }));
  }

  it("fermée : rien n'est rendu", () => {
    render(<RefuseConsentDialog id={9} firstName="Kemi" open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("motif obligatoire en liste fermée, bouton danger, délai de 30 jours au vouvoiement", async () => {
    const user = userEvent.setup();
    const dialog = renderDialog();
    expect(useReferential).toHaveBeenCalledWith("refusal-reasons");
    expect(dialog.getByRole("heading", { name: "Refuser la demande de Kemi ?" })).toHaveClass("text-error-700");
    expect(dialog.getByText(/Votre enfant pourra vous faire une nouvelle demande dans 30 jours\./)).toBeInTheDocument();
    const select = dialog.getByRole("combobox", { name: /Motif du refus/ });
    expect(within(select).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Choisissez…",
      "Mon enfant est trop jeune",
      "Autre raison",
    ]);
    const submit = dialog.getByRole("button", { name: "Refuser la demande" });
    expect(submit).toHaveClass("bg-error-600");
    await user.click(submit);
    expect((await dialog.findAllByText("Choisissez un motif.")).length).toBeGreaterThan(0);
    expect(POST).not.toHaveBeenCalled();
    expect(await axe(document.body)).toHaveNoViolations();
    // Choisir un motif efface l'erreur
    await user.selectOptions(select, "other");
    expect(dialog.queryByText("Choisissez un motif.")).not.toBeInTheDocument();
  });

  it("envoie le motif et les précisions nettoyées, ferme la modale et relit l'écran", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    POST.mockResolvedValue(respond(200, { data: consent({ status: "refused" }) }));
    const dialog = renderDialog(onClose);
    await user.selectOptions(dialog.getByRole("combobox", { name: /Motif du refus/ }), "too-young");
    await user.type(dialog.getByRole("textbox", { name: /Précisions/ }), "  Attends l'an prochain  ");
    await user.click(dialog.getByRole("button", { name: "Refuser la demande" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(POST).toHaveBeenCalledWith("/api/accounts/consent-requests/{id}/refuse/", {
      params: { path: { id: "9" } },
      body: { reason: "too-young", note: "Attends l'an prochain" },
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("« Annuler » referme la modale sans aucun appel à l'API", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const dialog = renderDialog(onClose);
    await user.selectOptions(dialog.getByRole("combobox", { name: /Motif du refus/ }), "too-young");
    await user.click(dialog.getByRole("button", { name: "Annuler" }));
    expect(onClose).toHaveBeenCalled();
    expect(POST).not.toHaveBeenCalled();
  });

  it("demande close entre-temps : message traduit et écran relu", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(
      respond(409, { error: { code: "CONSENT_ALREADY_RESOLVED", message: "Déjà traitée", fields: {} } }),
    );
    const dialog = renderDialog();
    await user.selectOptions(dialog.getByRole("combobox", { name: /Motif du refus/ }), "too-young");
    await user.click(dialog.getByRole("button", { name: "Refuser la demande" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(dialog.getByRole("alert")).toBeInTheDocument();
  });

  it("motif refusé par l'API : erreur du champ, sans relire l'écran", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(
      respond(400, {
        error: { code: "VALIDATION_ERROR", message: "Invalide", fields: { reason: [{ message: "Motif inconnu." }] } },
      }),
    );
    const dialog = renderDialog();
    await user.selectOptions(dialog.getByRole("combobox", { name: /Motif du refus/ }), "other");
    await user.click(dialog.getByRole("button", { name: "Refuser la demande" }));
    expect(await dialog.findByText("Motif inconnu.")).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});

describe("ConsentDecision (actions de WPD05)", () => {
  it("accepter : retour à WPD01 avec la confirmation", async () => {
    POST.mockResolvedValue(respond(200, { data: consent({ status: "accepted" }) }));
    render(<ConsentDecision id={9} firstName="Kemi" />);
    await userEvent.click(screen.getByRole("button", { name: "Accepter la demande" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/parent?consentement=9"));
    expect(POST).toHaveBeenCalledWith("/api/accounts/consent-requests/{id}/accept/", { params: { path: { id: "9" } } });
  });

  it("demande expirée entre-temps : message et écran relu en lecture seule", async () => {
    POST.mockResolvedValue(respond(409, { error: { code: "CONSENT_REQUEST_EXPIRED", message: "Expirée", fields: {} } }));
    render(<ConsentDecision id={9} firstName="Kemi" />);
    await userEvent.click(screen.getByRole("button", { name: "Accepter la demande" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("autre erreur : message sans relecture", async () => {
    POST.mockResolvedValue(respond(500));
    render(<ConsentDecision id={9} firstName="Kemi" />);
    await userEvent.click(screen.getByRole("button", { name: "Accepter la demande" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("« Refuser » ouvre la modale, qui se referme sans rien accepter", async () => {
    const user = userEvent.setup();
    render(<ConsentDecision id={9} firstName="Kemi" />);
    await user.click(screen.getByRole("button", { name: "Refuser" }));
    const dialog = screen.getByRole("dialog", { name: "Refuser la demande de Kemi ?" });
    await user.click(within(dialog).getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(POST).not.toHaveBeenCalled();
  });
});

describe("ConsentOrigin", () => {
  it("origine enfant (W06)", () => {
    render(<ConsentOrigin request={consent()} />);
    expect(screen.getByText("Demande envoyée par Kemi")).toBeInTheDocument();
    expect(screen.getByText(/le 15 octobre 2026 en créant son compte Steamy/)).toBeInTheDocument();
  });

  it("changement de parent (support) et enfant créé par le parent", () => {
    const { rerender } = render(<ConsentOrigin request={consent({ origin: "support" })} />);
    expect(screen.getByText("Changement de parent transmis par l'équipe Steamy")).toBeInTheDocument();
    rerender(<ConsentOrigin request={consent({ origin: "parent" })} />);
    expect(screen.getByText("Vous avez ajouté Kemi le 15 octobre 2026.")).toBeInTheDocument();
  });

  it("origine enseignant sans classe servie par l'API : rien", () => {
    const { container } = render(<ConsentOrigin request={consent({ origin: "teacher" })} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ConsentRequestView (WPD05)", () => {
  it("en attente : seulement les données de D20, origine, encart du responsable légal et actions", async () => {
    const { container } = render(<ConsentRequestView request={consent()} />);
    expect(screen.getByRole("link", { name: "Accueil" })).toHaveAttribute("href", "/parent");
    const card = screen.getByRole("article", { name: "Demande de Kemi Adjovi" });
    expect(within(card).getByRole("heading", { level: 2 })).toHaveTextContent("Kemi Adjovi");
    expect(within(card).getByText("@kemi.a · 13 ans")).toBeInTheDocument();
    expect(within(card).getByText("Vous êtes sa mère")).toBeInTheDocument();
    expect(within(card).getByText("En attente")).toBeInTheDocument();
    expect(within(card).getByText("Demande valable jusqu'au 22 octobre 2026.")).toBeInTheDocument();
    expect(screen.getByText(/vous confirmez être le responsable légal de Kemi/)).toHaveTextContent(
      "une nouvelle demande sera possible dans 30 jours",
    );
    expect(screen.getByRole("button", { name: "Accepter la demande" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refuser" })).toBeInTheDocument();
    // Maquette « À ne pas porter » : aucune information saisie après l'accord
    expect(screen.queryByText(/Informations renseignées|Localité|Centres d'intérêt/)).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("se replie sur le libellé du lien sans libellé côté parent", () => {
    render(<ConsentRequestView request={consent({ relationship: { id: 1, code: "mere", label: "Mère", parentLabel: "" } })} />);
    expect(screen.getByText("Mère")).toBeInTheDocument();
  });

  it.each([
    ["accepted", "Acceptée", "Vous avez accepté cette demande le 16 octobre 2026 : Kemi peut terminer son inscription."],
    [
      "refused",
      "Refusée",
      "Vous avez refusé cette demande le 16 octobre 2026 (motif : « Mon enfant est trop jeune »). Une nouvelle demande sera possible 30 jours après votre refus.",
    ],
    [
      "expired",
      "Expirée",
      "Cette demande a expiré le 22 octobre 2026, sans réponse pendant 7 jours. Votre enfant peut vous en envoyer une nouvelle.",
    ],
    [
      "cancelled",
      "Annulée",
      "Cette demande a été annulée : votre enfant en a envoyé une plus récente ou a abandonné son inscription.",
    ],
  ])("%s : lecture seule, sans action ni date d'expiration", async (status, badge, note) => {
    const { container } = render(
      <ConsentRequestView
        request={consent({
          status,
          resolvedAt: status === "expired" ? null : "2026-10-16T09:00:00Z",
          refusalReason: status === "refused" ? REASONS[0] : null,
        })}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(note);
    expect(within(screen.getByRole("article")).getByText(badge)).toBeInTheDocument();
    expect(screen.queryByText(/valable jusqu/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accepter la demande" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refuser" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/parent");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("refusée sans date ni motif connus", () => {
    render(<ConsentRequestView request={consent({ status: "refused" })} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Vous avez refusé cette demande. Une nouvelle demande sera possible 30 jours après votre refus.",
    );
  });
});

describe("ConsentRequestScreen", () => {
  const params = Promise.resolve({ id: "9" });

  it("lit la demande adressée au numéro du parent", async () => {
    const request = consent();
    GET.mockResolvedValue(respond(200, { data: request }));
    const tree = (await ConsentRequestScreen({ params })) as ReactElement<{ request: ConsentRequest }>;
    expect(GET).toHaveBeenCalledWith("/api/accounts/consent-requests/{id}/", { params: { path: { id: "9" } } });
    expect(tree.type).toBe(ConsentRequestView);
    expect(tree.props.request).toBe(request);
  });

  it("demande d'un autre numéro ou inconnue : « Demande introuvable » (404)", async () => {
    GET.mockResolvedValue(respond(404, { error: { code: "NOT_FOUND" } }));
    await expect(ConsentRequestScreen({ params })).rejects.toThrow("not-found");
    expect(notFound).toHaveBeenCalled();
  });

  it("identifiant illisible : « Demande introuvable » sans appel à l'API", async () => {
    GET.mockClear();
    await expect(ConsentRequestScreen({ params: Promise.resolve({ id: "abc" }) })).rejects.toThrow("not-found");
    expect(GET).not.toHaveBeenCalled();
  });

  it("session perdue : ne rend rien (la garde redirige)", async () => {
    GET.mockResolvedValue(respond(401, { error: { code: "NOT_AUTHENTICATED" } }));
    expect(await ConsentRequestScreen({ params })).toBeNull();
  });

  it("squelette annoncé au vouvoiement", () => {
    render(<ConsentRequestSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de la demande…" })).toBeInTheDocument();
  });
});
