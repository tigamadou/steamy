import type { Schemas } from "@steamy/api-client";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetReferentials } from "@/lib/use-referential";
import { axe } from "@/test/axe";
import { childDetail } from "@/test/parent-fixtures";

const { serverGET, GET, POST, DELETE, router } = vi.hoisted(() => ({
  serverGET: vi.fn(),
  GET: vi.fn(),
  POST: vi.fn(),
  DELETE: vi.fn(),
  router: { push: vi.fn(), refresh: vi.fn() },
}));
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET: serverGET }) }));
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ GET, POST, DELETE }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { CancelDeletionButton } = await import("./CancelDeletionButton");
const { DeleteChildForm } = await import("./DeleteChildForm");
const { ChildDeletionRequest } = await import("./ChildDeletionRequest");
const { DeleteChild, DeleteChildSkeleton, parseRequestId } = await import("./DeleteChild");

const respond = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });
const failure = (status: number, code: string, fields?: Record<string, string>) => ({
  error: {
    code,
    message: "",
    fields: fields && Object.fromEntries(Object.entries(fields).map(([name, text]) => [name, [{ message: text }]])),
  },
  response: new Response(null, { status }),
});
const REASONS = [
  { id: 1, code: "plus-utilise", label: "Le compte n'est plus utilisé" },
  { id: 2, code: "autre", label: "Autre raison" },
];

function deletionRequest(overrides: Partial<Schemas["DeletionRequest"]> = {}): Schemas["DeletionRequest"] {
  return {
    id: 9,
    accountId: 7,
    firstName: "Léa",
    status: "pending_parent",
    reason: { id: 2, code: "autre", label: "Autre raison" },
    note: "Je n'ai plus le temps.",
    requestedByLearner: true,
    scheduledFor: null,
    createdAt: "2026-10-18T09:00:00Z",
    resolvedAt: null,
    ...overrides,
  } as Schemas["DeletionRequest"];
}

beforeEach(() => {
  resetReferentials();
  serverGET.mockReset();
  GET.mockReset().mockResolvedValue(respond(200, REASONS));
  POST.mockReset();
  DELETE.mockReset();
  router.push.mockReset();
  router.refresh.mockReset();
});

describe("CancelDeletionButton (WPD02, WPD03)", () => {
  it("annule la suppression puis mène à la page qui l'annonce ; erreur annoncée", async () => {
    const user = userEvent.setup();
    DELETE.mockResolvedValueOnce(failure(500, "SERVER_ERROR")).mockResolvedValueOnce(respond(204));
    render(<CancelDeletionButton childId={7} firstName="Léa" redirectTo="/parent/enfants?annulation=7" />);
    const button = screen.getByRole("button", { name: /^Annuler la suppression\s*du compte de Léa$/ });
    await user.click(button);
    expect(await screen.findByRole("alert")).not.toBeEmptyDOMElement();
    expect(router.push).not.toHaveBeenCalled();
    await user.click(button);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/parent/enfants?annulation=7"));
    expect(DELETE).toHaveBeenCalledWith("/api/accounts/children/{id}/deletion/", { params: { path: { id: "7" } } });
  });
});

describe("DeleteChildForm (WPD09, initiative du parent)", () => {
  it("texte D54 sans « définitivement » ni « irréversible », motif requis, puis suppression", async () => {
    const user = userEvent.setup();
    const { container } = render(<DeleteChildForm child={{ id: 7, firstName: "Léa" }} />);
    const form = screen.getByRole("form", { name: "Supprimer le compte de Léa" });
    expect(form).toHaveTextContent("désactivé immédiatement");
    expect(form).toHaveTextContent("anonymisé 30 jours plus tard");
    expect(form).toHaveTextContent("Les factures de vos commandes sont conservées.");
    expect(form.textContent).not.toMatch(/définitivement|irréversible/i);
    expect(screen.getByRole("link", { name: "Annuler" })).toHaveAttribute("href", "/parent/enfants/7");
    await screen.findByRole("option", { name: "Autre raison" });
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole("button", { name: "Supprimer le compte" }));
    expect(await screen.findByRole("link", { name: "Choisissez le motif de la suppression." })).toBeInTheDocument();
    expect(POST).not.toHaveBeenCalled();

    POST.mockResolvedValueOnce(respond(200, childDetail()));
    await user.selectOptions(screen.getByRole("combobox", { name: /Motif de la suppression/ }), "autre");
    await user.type(screen.getByRole("textbox", { name: /Précisions/ }), "  Déménagement. ");
    await user.click(screen.getByRole("button", { name: "Supprimer le compte" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/parent/enfants/7?confirmation=supprime"));
    expect(POST).toHaveBeenCalledWith("/api/accounts/children/{id}/deletion/", {
      params: { path: { id: "7" } },
      body: { reason: "autre", note: "Déménagement." },
    });
  });

  it("erreurs de l'API : au champ, sinon message général", async () => {
    const user = userEvent.setup();
    render(<DeleteChildForm child={{ id: 7, firstName: "Léa" }} />);
    await screen.findByRole("option", { name: "Autre raison" });
    await user.selectOptions(screen.getByRole("combobox", { name: /Motif de la suppression/ }), "autre");
    POST.mockResolvedValueOnce(failure(400, "VALIDATION_ERROR", { note: "Trop long." }));
    await user.click(screen.getByRole("button", { name: "Supprimer le compte" }));
    expect(await screen.findByRole("link", { name: "Trop long." })).toBeInTheDocument();
    POST.mockResolvedValueOnce(failure(500, "SERVER_ERROR"));
    await user.click(screen.getByRole("button", { name: "Supprimer le compte" }));
    await waitFor(() => expect(screen.queryByRole("link", { name: "Trop long." })).toBeNull());
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("ChildDeletionRequest (WPD09, demande de l'enfant)", () => {
  it("motif et précisions de l'enfant ; « Valider la suppression », confirmée en modale, désactive le compte", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValueOnce(respond(200, deletionRequest({ status: "scheduled" })));
    const { container } = render(<ChildDeletionRequest request={deletionRequest()} />);
    const section = screen.getByRole("region", { name: "Léa demande la suppression de son compte" });
    expect(within(section).getByText("Autre raison")).toBeInTheDocument();
    expect(within(section).getByText("« Je n'ai plus le temps. »")).toBeInTheDocument();
    expect(section.textContent).not.toMatch(/définitivement|irréversible/i);
    expect(await axe(container)).toHaveNoViolations();
    // Modale de confirmation : « Annuler » la referme sans appel
    await user.click(screen.getByRole("button", { name: "Valider la suppression" }));
    let dialog = screen.getByRole("dialog", { name: "Valider la suppression du compte de Léa ?" });
    await user.click(within(dialog).getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(POST).not.toHaveBeenCalled();
    // Échap la referme aussi
    await user.click(screen.getByRole("button", { name: "Valider la suppression" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Valider la suppression" }));
    dialog = screen.getByRole("dialog", { name: "Valider la suppression du compte de Léa ?" });
    await user.click(within(dialog).getByRole("button", { name: "Valider la suppression" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/parent/enfants/7?confirmation=supprime"));
    // Verrou gardé jusqu'à la navigation : le bouton reste occupé
    expect(within(dialog).getByRole("button", { name: "Valider la suppression" })).toHaveAttribute("aria-busy", "true");
    expect(POST).toHaveBeenCalledWith("/api/accounts/deletion-requests/{id}/approve/", { params: { path: { id: "9" } } });
  });

  it("« Refuser la demande » : l'enfant est notifié ; demande déjà traitée : écran relu", async () => {
    const user = userEvent.setup();
    render(<ChildDeletionRequest request={deletionRequest({ reason: null, note: "" })} />);
    expect(screen.getByText("Aucun motif indiqué")).toBeInTheDocument();
    expect(screen.queryByText("Précisions")).toBeNull();
    POST.mockResolvedValueOnce(failure(404, "NOT_FOUND"));
    await user.click(screen.getByRole("button", { name: "Refuser la demande" }));
    expect(await screen.findByRole("alert")).not.toBeEmptyDOMElement();
    expect(router.refresh).toHaveBeenCalled();
    POST.mockResolvedValueOnce(respond(200, deletionRequest({ status: "refused" })));
    await user.click(screen.getByRole("button", { name: "Refuser la demande" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/parent/enfants/7?confirmation=demande-refusee"));
    expect(POST).toHaveBeenLastCalledWith("/api/accounts/deletion-requests/{id}/refuse/", { params: { path: { id: "9" } } });
  });

  it("un double clic n'envoie qu'une décision", async () => {
    const user = userEvent.setup();
    let finish: (value: unknown) => void = () => {};
    POST.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    render(<ChildDeletionRequest request={deletionRequest()} />);
    await user.click(screen.getByRole("button", { name: "Valider la suppression" }));
    await user.dblClick(within(screen.getByRole("dialog")).getByRole("button", { name: "Valider la suppression" }));
    expect(POST).toHaveBeenCalledTimes(1);
    finish(respond(200, deletionRequest({ status: "scheduled" })));
    await waitFor(() => expect(router.push).toHaveBeenCalledTimes(1));
  });
});

describe("DeleteChild (WPD09, serveur)", () => {
  const params = (id = "7") => Promise.resolve({ id });
  const query = (demande?: string) => Promise.resolve(demande ? { demande } : {});

  function routeApi(child: unknown, request: unknown = respond(404)) {
    serverGET.mockImplementation(async (path: string) =>
      path === "/api/accounts/children/{id}/" ? child : request,
    );
  }

  it("lit la demande dans l'URL", () => {
    expect(parseRequestId("9")).toBe("9");
    expect(parseRequestId(["9"])).toBe("9");
    expect(parseRequestId("abc")).toBeNull();
    expect(parseRequestId(undefined)).toBeNull();
  });

  it("sans demande : formulaire du parent, sous le fil d'Ariane", async () => {
    routeApi(respond(200, childDetail()));
    render((await DeleteChild({ params: params(), searchParams: query() })) as ReactElement);
    expect(screen.getByRole("link", { name: "Léa Adjovi" })).toHaveAttribute("href", "/parent/enfants/7");
    expect(screen.getByRole("form", { name: "Supprimer le compte de Léa" })).toBeInTheDocument();
  });

  it("demande de l'enfant (URL ou suppression en attente) : validation ; déjà traitée : rappel", async () => {
    routeApi(respond(200, childDetail()), respond(200, deletionRequest()));
    const view = render((await DeleteChild({ params: params(), searchParams: query("9") })) as ReactElement);
    expect(screen.getByRole("button", { name: "Valider la suppression" })).toBeInTheDocument();
    expect(serverGET).toHaveBeenCalledWith("/api/accounts/deletion-requests/{id}/", { params: { path: { id: "9" } } });
    view.unmount();

    routeApi(
      respond(200, childDetail({ deletion: { id: 9, status: "pending_parent", scheduledFor: null } })),
      respond(200, deletionRequest({ status: "refused" })),
    );
    render((await DeleteChild({ params: params(), searchParams: query() })) as ReactElement);
    expect(screen.getByRole("heading", { level: 2, name: "Cette demande a déjà été traitée" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour au profil" })).toHaveAttribute("href", "/parent/enfants/7");
  });

  it("suppression programmée : rappel daté et « Annuler la suppression »", async () => {
    routeApi(respond(200, childDetail({ deletion: { id: 4, status: "scheduled", scheduledFor: "2026-11-18T10:00:00Z" } })));
    const view = render((await DeleteChild({ params: params(), searchParams: query() })) as ReactElement);
    expect(screen.getByRole("region", { name: "Suppression programmée" })).toHaveTextContent(
      "Le compte de Léa est désactivé et sera anonymisé le 18 novembre 2026. Vous pouvez encore annuler la suppression.",
    );
    expect(screen.getByRole("button", { name: /^Annuler la suppression/ })).toBeInTheDocument();
    view.unmount();
    routeApi(respond(200, childDetail({ deletion: { id: 4, status: "scheduled", scheduledFor: null } })));
    render((await DeleteChild({ params: params(), searchParams: query() })) as ReactElement);
    expect(screen.getByText(/Le compte de Léa est désactivé\. Vous pouvez encore annuler/)).toBeInTheDocument();
  });

  it("enfant ou demande d'une autre famille → introuvable ; session perdue → rien ; squelette", async () => {
    routeApi(respond(200, childDetail()), respond(404));
    await expect(DeleteChild({ params: params(), searchParams: query("9") })).rejects.toThrow("NEXT_NOT_FOUND");
    routeApi(respond(200, childDetail()), respond(200, deletionRequest({ accountId: 8 })));
    await expect(DeleteChild({ params: params(), searchParams: query("9") })).rejects.toThrow("NEXT_NOT_FOUND");
    routeApi(respond(200, childDetail()), respond(401));
    expect(await DeleteChild({ params: params(), searchParams: query("9") })).toBeNull();
    routeApi(respond(401));
    expect(await DeleteChild({ params: params(), searchParams: query() })).toBeNull();
    render(<DeleteChildSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de la suppression du compte…" })).toBeInTheDocument();
  });
});
