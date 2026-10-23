import type { Schemas } from "@steamy/api-client";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";
import { child } from "@/test/parent-fixtures";

const { POST, GET, serverGET, router } = vi.hoisted(() => ({
  POST: vi.fn(),
  GET: vi.fn(),
  serverGET: vi.fn(),
  router: { push: vi.fn(), refresh: vi.fn() },
}));
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ GET, POST }) }));
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET: serverGET }) }));
vi.mock("@/lib/use-referential", () => ({
  useReferential: () => ({ items: [{ id: 1, code: "other", label: "Autre raison" }], status: "ready", retry: vi.fn() }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  notFound: () => {
    throw new Error("not-found");
  },
}));

const { TeacherConsentDecision } = await import("./TeacherConsentDecision");
const { ConsentOrigin } = await import("./ConsentOrigin");
const { ConsentRequestScreen, ConsentRequestView } = await import("./ConsentRequestScreen");
const { suggestUsername } = await import("@/features/parent/children/username");

type ConsentRequest = Schemas["ConsentRequest"];

const CLASSROOM = {
  name: "5e B robotique",
  teacherName: "Koffi Adékambi",
  schoolName: "CEG Gbégamey",
  courseTitle: "Découverte de la robotique",
};

function invitation(overrides: Partial<ConsentRequest> = {}): ConsentRequest {
  return {
    id: 21,
    origin: "teacher",
    classroom: CLASSROOM,
    status: "pending",
    firstName: "Kemi",
    lastName: "Adjovi",
    username: null,
    age: null,
    relationship: { id: 1, code: "mere", label: "Mère", parentLabel: "Vous êtes sa mère" },
    createdAt: "2026-10-15T08:00:00Z",
    expiresAt: "2026-10-22T08:00:00Z",
    resolvedAt: null,
    refusalReason: null,
    refusalNote: "",
    ...overrides,
  };
}

const respond = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });
const failure = (status: number, code: string, fields?: Record<string, string>) => ({
  error: {
    code,
    message: "",
    fields: fields && Object.fromEntries(Object.entries(fields).map(([name, text]) => [name, [{ message: text }]])),
  },
  response: new Response(null, { status }),
});
const KIDS = [{ id: 7, firstName: "Léa", lastName: "Adjovi" }];

beforeEach(() => {
  POST.mockReset();
  GET.mockReset().mockResolvedValue(respond(200, { available: true }));
  serverGET.mockReset();
  router.push.mockReset();
  router.refresh.mockReset();
});

describe("ConsentOrigin · invitation d'un enseignant (D60)", () => {
  it("enseignant, classe, établissement et parcours, sans paiement", async () => {
    const { container } = render(<ConsentOrigin request={invitation()} />);
    expect(screen.getByText("Invitation de Koffi Adékambi")).toBeInTheDocument();
    expect(screen.getByText(/couvert par l'établissement, sans paiement/)).toBeInTheDocument();
    for (const [label, value] of [
      ["Enseignant", "Koffi Adékambi"],
      ["Classe", "5e B robotique"],
      ["Établissement", "CEG Gbégamey"],
      ["Parcours", "Découverte de la robotique"],
    ]) {
      expect(screen.getByText(label).nextElementSibling).toHaveTextContent(value);
    }
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("TeacherConsentDecision (WPD05, C11)", () => {
  it("création du compte : identifiant proposé, règles du mot de passe, puis acceptation et retour à WPD01", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(respond(200, invitation({ status: "accepted" })));
    const { container } = render(
      <TeacherConsentDecision id={21} firstName="Kémi" lastName="Adjovi Dossou" classroomName="5e B" kids={[]} />,
    );
    // Sans enfant rattaché : pas de choix, création directe
    expect(screen.queryByRole("group")).toBeNull();
    const username = screen.getByRole("textbox", { name: /^Identifiant/ });
    expect(username).toHaveValue("kemi.adjovi-dossou");
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole("button", { name: "Accepter l'invitation" }));
    expect(await screen.findByRole("link", { name: "Choisissez un mot de passe qui respecte les règles." })).toBeInTheDocument();
    expect(POST).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/^Mot de passe initial/), "Robot2026x");
    await user.click(screen.getByRole("button", { name: "Accepter l'invitation" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/parent?consentement=21"));
    expect(GET).toHaveBeenCalledWith("/api/auth/username-availability/", {
      params: { query: { username: "kemi.adjovi-dossou" } },
    });
    expect(POST).toHaveBeenCalledWith("/api/accounts/consent-requests/{id}/accept/", {
      params: { path: { id: "21" } },
      body: { username: "kemi.adjovi-dossou", password: "Robot2026x" },
    });
  });

  it("identifiant illisible ou déjà pris, puis pris côté serveur : erreurs au champ", async () => {
    const user = userEvent.setup();
    render(<TeacherConsentDecision id={21} firstName="Kemi" lastName="Adjovi" classroomName="5e B" kids={[]} />);
    const username = screen.getByRole("textbox", { name: /^Identifiant/ });
    await user.type(screen.getByLabelText(/^Mot de passe initial/), "Robot2026x");
    await user.clear(username);
    await user.type(username, "12");
    await user.click(screen.getByRole("button", { name: "Accepter l'invitation" }));
    expect(await screen.findByRole("link", { name: /^L'identifiant : 3 à 30 caractères/ })).toBeInTheDocument();

    await user.clear(username);
    await user.type(username, "kemi.a");
    GET.mockResolvedValueOnce(respond(200, { available: false }));
    await user.click(screen.getByRole("button", { name: "Accepter l'invitation" }));
    expect(await screen.findByRole("link", { name: /déjà associé à un compte Steamy/ })).toBeInTheDocument();
    expect(POST).not.toHaveBeenCalled();

    POST.mockResolvedValueOnce(failure(400, "USERNAME_TAKEN", { username: "USERNAME_TAKEN", password: "x", other: "Autre." }));
    await user.click(screen.getByRole("button", { name: "Accepter l'invitation" }));
    expect(await screen.findByRole("link", { name: /déjà associé à un compte Steamy/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Choisissez un mot de passe qui respecte les règles." })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Autre.");

    POST.mockResolvedValueOnce(failure(409, "CONSENT_REQUEST_EXPIRED"));
    await user.click(screen.getByRole("button", { name: "Accepter l'invitation" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(router.push).not.toHaveBeenCalled();
  });

  it("enfant déjà inscrit : « Rattacher {Prénom} à la classe » sans nouvel identifiant", async () => {
    const user = userEvent.setup();
    render(<TeacherConsentDecision id={21} firstName="Kemi" lastName="Adjovi" classroomName="5e B" kids={KIDS} />);
    const group = screen.getByRole("group", { name: "Kemi a-t-il déjà un compte Steamy ?" });
    expect(within(group).getByRole("radio", { name: "Créer le compte de Kemi" })).toBeChecked();
    await user.click(within(group).getByText("Rattacher Léa à la classe"));
    expect(screen.queryByRole("textbox", { name: /^Identifiant/ })).toBeNull();
    expect(screen.getByText(/Léa rejoint la classe « 5e B » avec son compte actuel/)).toBeInTheDocument();

    POST.mockResolvedValueOnce(failure(404, "NOT_FOUND", { learnerId: "NOT_FOUND" }));
    await user.click(screen.getByRole("button", { name: "Accepter l'invitation" }));
    expect(await screen.findAllByText("Cet enfant n'est pas rattaché à votre compte.")).not.toHaveLength(0);

    POST.mockResolvedValueOnce(respond(200, invitation({ status: "accepted" })));
    await user.click(screen.getByRole("button", { name: "Accepter l'invitation" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/parent?consentement=21"));
    expect(POST).toHaveBeenLastCalledWith("/api/accounts/consent-requests/{id}/accept/", {
      params: { path: { id: "21" } },
      body: { learnerId: 7 },
    });
    expect(GET).not.toHaveBeenCalled();
  });

  it("déjà dans la classe : message général ; « Refuser » ouvre la modale", async () => {
    const user = userEvent.setup();
    render(<TeacherConsentDecision id={21} firstName="Kemi" lastName="Adjovi" classroomName="5e B" kids={KIDS} />);
    await user.click(screen.getByText("Rattacher Léa à la classe"));
    POST.mockResolvedValueOnce(failure(409, "ALREADY_IN_CLASSROOM"));
    await user.click(screen.getByRole("button", { name: "Accepter l'invitation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Acceptation impossible :");
    await user.click(screen.getByRole("button", { name: "Refuser" }));
    expect(screen.getByRole("dialog", { name: "Refuser la demande de Kemi ?" })).toBeInTheDocument();
  });

  it("identifiant proposé : sans accents ni caractères refusés, tronqué à 30", () => {
    expect(suggestUsername("Léa", "Adjovi")).toBe("lea.adjovi");
    expect(suggestUsername(" Ama-Rose ", "D'Almeida")).toBe("ama-rose.d-almeida");
    expect(suggestUsername("Ébène", "")).toBe("ebene");
    expect(suggestUsername("Abcdefghijklmnop", "Qrstuvwxyzabcdefgh")).toHaveLength(30);
  });
});

describe("ConsentRequestView et ConsentRequestScreen · invitation d'un enseignant", () => {
  it("en attente : origine enseignant et formulaire d'acceptation de l'invitation", () => {
    render(<ConsentRequestView request={invitation()} kids={KIDS} />);
    expect(screen.getByText("Invitation de Koffi Adékambi")).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Accepter l'invitation" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accepter la demande" })).toBeNull();
  });

  it.each([
    ["accepted", "Vous avez accepté cette invitation le 18 octobre 2026 : Kemi a rejoint la classe « 5e B robotique »."],
    ["expired", "L'enseignant peut vous inviter de nouveau."],
    ["cancelled", "Cette invitation a été retirée par l'enseignant."],
  ] as const)("close (%s) : lecture seule propre à l'invitation", (status, text) => {
    render(<ConsentRequestView request={invitation({ status, resolvedAt: "2026-10-18T09:00:00Z" })} />);
    expect(screen.getByRole("status")).toHaveTextContent(text);
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("serveur : enfants actifs lus pour le rattachement ; demande close : sans lecture des enfants", async () => {
    serverGET.mockImplementation(async (path: string) =>
      path === "/api/accounts/children/"
        ? respond(200, { results: [child(), child({ id: 8, firstName: "Noé", status: "deactivated" })] })
        : respond(200, invitation()),
    );
    const params = Promise.resolve({ id: "21" });
    const tree = (await ConsentRequestScreen({ params })) as ReactElement<Parameters<typeof ConsentRequestView>[0]>;
    expect(tree.props.kids).toEqual([{ id: 7, firstName: "Léa", lastName: "Adjovi" }]);
    expect(serverGET).toHaveBeenCalledWith("/api/accounts/children/", { params: { query: { pageSize: 50 } } });

    serverGET.mockReset().mockImplementation(async (path: string) =>
      path === "/api/accounts/children/" ? respond(200, {}) : respond(200, invitation()),
    );
    const empty = (await ConsentRequestScreen({ params })) as ReactElement<Parameters<typeof ConsentRequestView>[0]>;
    expect(empty.props.kids).toEqual([]);

    serverGET.mockReset().mockImplementation(async (path: string) =>
      path === "/api/accounts/children/" ? respond(401) : respond(200, invitation()),
    );
    expect(await ConsentRequestScreen({ params })).toBeNull();

    serverGET.mockReset().mockResolvedValue(respond(200, invitation({ status: "accepted" })));
    await ConsentRequestScreen({ params });
    expect(serverGET).toHaveBeenCalledTimes(1);
  });
});
