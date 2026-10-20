import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";
import { childDetail } from "@/test/parent-fixtures";

const { GET, POST, PATCH, router, serverGET } = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PATCH: vi.fn(),
  router: { push: vi.fn() },
  serverGET: vi.fn(),
}));
type Referential = { items?: object[]; status: string; retry: () => void };
const referentials: Record<string, Referential> = {};
const useReferential = vi.fn<(name: string, options?: { country?: string }) => Referential>(
  (name, options) =>
    referentials[options?.country ? `${name}?${options.country}` : name] ?? { status: "idle", retry: () => {} },
);
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ GET, POST, PATCH }) }));
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET: serverGET }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/lib/use-referential", () => ({ useReferential }));

const { ChildForm, USERNAME_RULE, USERNAME_TAKEN } = await import("./ChildForm");
const { EditChild, EditChildSkeleton } = await import("./EditChild");

const ready = (items: object[]): Referential => ({ items, status: "ready", retry: vi.fn() });
const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const failure = (status: number, code: string, fields?: Record<string, string>, message = "") =>
  respond(status, {
    error: {
      code,
      message,
      fields: fields && Object.fromEntries(Object.entries(fields).map(([name, text]) => [name, [{ message: text }]])),
    },
  });

const available = (value: boolean) => respond(200, { data: { available: value } });

function setReferentials() {
  for (const key of Object.keys(referentials)) delete referentials[key];
  referentials.relationships = ready([
    { id: 1, code: "mere", label: "Mère", parentLabel: "Vous êtes sa mère" },
    { id: 2, code: "pere", label: "Père", parentLabel: "Vous êtes son père" },
  ]);
  referentials["school-grades"] = ready([
    { id: 3, code: "5e", label: "5ᵉ" },
    { id: 4, code: "4e", label: "4ᵉ" },
  ]);
  referentials.countries = ready([
    { id: 1, code: "BJ", label: "Bénin" },
    { id: 2, code: "TG", label: "Togo" },
  ]);
  referentials["localities?BJ"] = ready([
    { id: 12, country: "BJ", city: "Cotonou", district: "Cocotomey", areaType: "urban" },
    { id: 13, country: "BJ", city: "Parakou", areaType: "urban" },
  ]);
  referentials["localities?TG"] = ready([{ id: 30, country: "TG", city: "Lomé", areaType: "urban" }]);
  referentials.disabilities = ready([
    { id: 1, code: "visuel", label: "Visuel" },
    { id: 2, code: "auditif", label: "Auditif" },
  ]);
}

beforeEach(() => {
  GET.mockReset();
  POST.mockReset();
  PATCH.mockReset();
  router.push.mockReset();
  setReferentials();
});

const submit = (name: string) => userEvent.click(screen.getByRole("button", { name }));

async function fillCreation({
  username = "ines.adjovi",
  password = "robot2026",
  birthDate = "2013-05-02",
}: { username?: string; password?: string; birthDate?: string } = {}) {
  await userEvent.type(screen.getByRole("textbox", { name: /^Prénom/ }), "Inès");
  await userEvent.type(screen.getByRole("textbox", { name: /^Nom/ }), "Adjovi");
  fireEvent.change(screen.getByLabelText(/^Date de naissance/), { target: { value: birthDate } });
  await userEvent.selectOptions(screen.getByRole("combobox", { name: /^Lien de parenté/ }), "mere");
  await userEvent.type(screen.getByRole("textbox", { name: /^Identifiant/ }), username);
  await userEvent.type(screen.getByLabelText(/^Mot de passe initial/), password);
}

describe("ChildForm · création (WPD04)", () => {
  it("champs de §5.11, encart « Notez ces identifiants », règles PwReq", async () => {
    const { container } = render(<ChildForm />);
    expect(screen.getByRole("heading", { level: 2, name: "Créer le compte de votre enfant" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Date de naissance/)).toBeRequired();
    expect(screen.getByRole("combobox", { name: /^Lien de parenté/ })).toBeRequired();
    expect(screen.getByText(/Notez bien ces identifiants/)).toBeInTheDocument();
    expect(screen.getByText("Au moins 8 caractères")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /Classe/ })).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("champs vides ou invalides : erreurs au vouvoiement, aucun appel", async () => {
    render(<ChildForm />);
    await userEvent.type(screen.getByRole("textbox", { name: /^Identifiant/ }), "97000000");
    await submit("Créer le compte");
    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Indiquez le prénom de votre enfant.");
    expect(summary).toHaveTextContent("Indiquez le nom de votre enfant.");
    expect(summary).toHaveTextContent("Indiquez la date de naissance de votre enfant.");
    expect(summary).toHaveTextContent("Choisissez votre lien de parenté.");
    expect(summary).toHaveTextContent(USERNAME_RULE);
    expect(summary).toHaveTextContent("Choisissez un mot de passe qui respecte les règles.");
    expect(POST).not.toHaveBeenCalled();
    expect(GET).not.toHaveBeenCalled();
  });

  it("identifiant déjà pris au départ du champ (W19), effacé à la saisie", async () => {
    GET.mockResolvedValue(available(false));
    render(<ChildForm />);
    const username = screen.getByRole("textbox", { name: /^Identifiant/ });
    await userEvent.type(username, "lea.adjovi");
    await userEvent.tab();
    expect(GET).toHaveBeenCalledWith("/api/auth/username-availability/", { params: { query: { username: "lea.adjovi" } } });
    expect(await screen.findByText(USERNAME_TAKEN)).toBeInTheDocument();
    await userEvent.type(username, "2");
    expect(screen.queryByText(USERNAME_TAKEN)).toBeNull();
  });

  it("identifiant invalide ou API muette au départ du champ : rien n'est affiché", async () => {
    GET.mockRejectedValue(new Error("hors ligne"));
    render(<ChildForm />);
    const username = screen.getByRole("textbox", { name: /^Identifiant/ });
    await userEvent.type(username, "a@b");
    await userEvent.tab();
    expect(GET).not.toHaveBeenCalled();
    await userEvent.clear(username);
    await userEvent.type(username, "ines.a");
    await userEvent.tab();
    await waitFor(() => expect(GET).toHaveBeenCalled());
    expect(screen.queryByText(USERNAME_TAKEN)).toBeNull();
  });

  it("identifiant pris à l'envoi : erreur au champ, aucune création", async () => {
    GET.mockResolvedValue(available(false));
    render(<ChildForm />);
    await fillCreation();
    await submit("Créer le compte");
    expect(await screen.findByRole("alert")).toHaveTextContent(USERNAME_TAKEN);
    expect(POST).not.toHaveBeenCalled();
  });

  it("crée le compte puis ouvre WPD03 avec le rappel de l'identifiant", async () => {
    GET.mockResolvedValue(available(true));
    POST.mockResolvedValue(respond(201, { data: childDetail({ id: 21 }) }));
    render(<ChildForm />);
    await fillCreation();
    await submit("Créer le compte");
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/parent/enfants/21?confirmation=cree"));
    expect(POST).toHaveBeenCalledWith("/api/accounts/children/", {
      body: {
        firstName: "Inès",
        lastName: "Adjovi",
        birthDate: "2013-05-02",
        relationship: "mere",
        username: "ines.adjovi",
        password: "robot2026",
      },
    });
  });

  it.each([
    ["USERNAME_TAKEN", { username: "Cet identifiant est déjà associé à un compte Steamy." }, /^Identifiant/],
    ["AGE_OUT_OF_RANGE", { birthDate: "Steamy est réservé aux 10-17 ans." }, /^Date de naissance/],
    ["PASSWORD_TOO_WEAK", { password: "Au moins une lettre et un chiffre." }, /^Mot de passe initial/],
  ])("erreur serveur %s affichée au champ", async (_code, fields, label) => {
    GET.mockResolvedValue(available(true));
    POST.mockResolvedValue(failure(400, "VALIDATION_ERROR", fields));
    render(<ChildForm />);
    await fillCreation();
    await submit("Créer le compte");
    const message = Object.values(fields)[0];
    await waitFor(() => expect(screen.getByLabelText(label)).toHaveAccessibleDescription(expect.stringContaining(message)));
    expect(router.push).not.toHaveBeenCalled();
  });

  it("erreur sans champ ou sur un champ inconnu : message en tête", async () => {
    GET.mockResolvedValue(available(true));
    POST.mockResolvedValueOnce(failure(503, "NETWORK_UNAVAILABLE"));
    render(<ChildForm />);
    await fillCreation();
    await submit("Créer le compte");
    expect(await screen.findByRole("alert")).toHaveTextContent("Vérifiez votre connexion internet");
    POST.mockResolvedValueOnce(failure(400, "VALIDATION_ERROR", { nonFieldErrors: "Requête invalide." }));
    await submit("Créer le compte");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Requête invalide."));
  });
});

describe("ChildForm · modification (WPD10)", () => {
  it("prérempli, identifiant non modifiable, finalité du genre et du handicap", async () => {
    const { container } = render(<ChildForm child={childDetail()} />);
    expect(screen.getByRole("textbox", { name: /^Prénom/ })).toHaveValue("Léa");
    expect(screen.getByLabelText(/^Date de naissance/)).toHaveValue("2013-03-14");
    expect(screen.getByRole("combobox", { name: /^Classe/ })).toHaveValue("4e");
    expect(screen.getByRole("combobox", { name: /^Localité/ })).toHaveValue("12");
    expect(screen.getByRole("radio", { name: "Fille" })).toBeChecked();
    expect(screen.getByRole("combobox", { name: /^Situation de handicap/ })).toHaveValue("");
    expect(screen.queryByRole("textbox", { name: /^Identifiant/ })).toBeNull();
    expect(screen.getByText(/il ne peut pas être modifié/)).toHaveTextContent("Identifiant : lea.adjovi");
    expect(screen.getByText(/servent seulement à adapter les parcours/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Annuler" })).toHaveAttribute("href", "/parent/enfants/7");
    expect(screen.queryByLabelText(/Mot de passe/)).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("enregistre puis revient à WPD03 avec la confirmation", async () => {
    PATCH.mockResolvedValue(respond(200, { data: childDetail() }));
    render(<ChildForm child={childDetail()} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /^Pays/ }), "TG");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /^Localité/ }), "30");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /^Classe/ }), "5e");
    await userEvent.click(screen.getByRole("radio", { name: "Ne pas dire" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /^Situation de handicap/ }), "visuel");
    await submit("Enregistrer");
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/parent/enfants/7?confirmation=modifie"));
    expect(PATCH).toHaveBeenCalledWith("/api/accounts/children/{id}/", {
      params: { path: { id: "7" } },
      body: {
        firstName: "Léa",
        lastName: "Adjovi",
        birthDate: "2013-03-14",
        gender: null,
        disability: "visuel",
        schoolGrade: "5e",
        locality: 30,
      },
    });
  });

  it("classe et localité absentes : non envoyées", async () => {
    PATCH.mockResolvedValue(respond(200, { data: childDetail() }));
    render(<ChildForm child={childDetail({ schoolGrade: null, locality: null, gender: null })} />);
    await submit("Enregistrer");
    await waitFor(() => expect(PATCH).toHaveBeenCalled());
    expect(PATCH.mock.calls[0][1].body).toEqual({
      firstName: "Léa",
      lastName: "Adjovi",
      birthDate: "2013-03-14",
      gender: null,
      disability: null,
    });
  });

  it("`BIRTHDATE_AGE_MISMATCH` au champ de la date de naissance", async () => {
    const message = "La date de naissance ne correspond pas à l'âge indiqué à l'inscription.";
    PATCH.mockResolvedValue(failure(400, "VALIDATION_ERROR", { birthDate: message }));
    render(<ChildForm child={childDetail()} />);
    fireEvent.change(screen.getByLabelText(/^Date de naissance/), { target: { value: "2011-03-14" } });
    await submit("Enregistrer");
    await waitFor(() => expect(screen.getByLabelText(/^Date de naissance/)).toHaveAccessibleDescription(message));
    expect(within(screen.getByRole("alert")).getByRole("link", { name: message })).toHaveAttribute("href", "#naissance");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("champs obligatoires vidés : aucun appel", async () => {
    render(<ChildForm child={childDetail()} />);
    await userEvent.clear(screen.getByRole("textbox", { name: /^Prénom/ }));
    await submit("Enregistrer");
    expect(await screen.findByRole("alert")).toHaveTextContent("Indiquez le prénom de votre enfant.");
    expect(PATCH).not.toHaveBeenCalled();
  });

  it("panne : message au vouvoiement", async () => {
    PATCH.mockResolvedValue(failure(500, "SERVER_ERROR"));
    render(<ChildForm child={childDetail()} />);
    await submit("Enregistrer");
    expect(await screen.findByRole("alert")).toHaveTextContent("Réessayez dans quelques instants.");
  });
});

describe("EditChild (WPD10, serveur)", () => {
  beforeEach(() => serverGET.mockReset());

  it("fil d'Ariane « Mes enfants › Prénom Nom › Modifier » et formulaire prérempli", async () => {
    serverGET.mockResolvedValue({ data: childDetail(), response: new Response(null, { status: 200 }) });
    const tree = (await EditChild({ params: Promise.resolve({ id: "7" }) })) as ReactElement;
    render(tree);
    const crumb = screen.getByRole("navigation", { name: "Fil d'Ariane" });
    expect(within(crumb).getByRole("link", { name: "Léa Adjovi" })).toHaveAttribute("href", "/parent/enfants/7");
    expect(within(crumb).getByText("Modifier")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("textbox", { name: /^Prénom/ })).toHaveValue("Léa");
  });

  it("enfant d'un autre parent : introuvable ; session perdue : rien", async () => {
    serverGET.mockResolvedValueOnce({ response: new Response(null, { status: 404 }) });
    await expect(EditChild({ params: Promise.resolve({ id: "99" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    serverGET.mockResolvedValueOnce({ response: new Response(null, { status: 401 }) });
    expect(await EditChild({ params: Promise.resolve({ id: "7" }) })).toBeNull();
  });

  it("squelette au vouvoiement", () => {
    render(<EditChildSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement du profil de votre enfant…" })).toBeInTheDocument();
  });
});
