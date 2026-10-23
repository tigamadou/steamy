import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const POST = vi.fn();
const PATCH = vi.fn();
const GET = vi.fn();
const router = { refresh: vi.fn() };
const getCurrentUser = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST, PATCH }) }));
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { TeacherProfileCard } = await import("./TeacherProfileCard");
const { TeacherConnectionCard } = await import("./TeacherConnectionCard");
const { CloseAccount, CLOSE_ACCOUNT_TEXT } = await import("./CloseAccount");
const { TeacherSettings, TeacherSettingsSkeleton } = await import("./TeacherSettings");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const failure = (status: number, code: string, fields?: Record<string, string>) =>
  respond(status, {
    error: {
      code,
      message: "",
      fields: fields && Object.fromEntries(Object.entries(fields).map(([name, text]) => [name, [{ message: text }]])),
    },
  });

const IDENTITY = { firstName: "Koffi", lastName: "Adékambi", school: "Collège Les Palmiers" };

beforeEach(() => {
  POST.mockReset();
  PATCH.mockReset();
  GET.mockReset();
  getCurrentUser.mockReset();
  router.refresh.mockReset();
});

describe("TeacherProfileCard (WT08, profil)", () => {
  it("nom et établissement en lecture seule, sans « Bio » ni téléphone", async () => {
    const { container } = render(<TeacherProfileCard identity={IDENTITY} />);
    expect(screen.getByText("Koffi Adékambi")).toBeInTheDocument();
    expect(screen.getByText("Collège Les Palmiers")).toBeInTheDocument();
    expect(screen.queryByText(/Bio|Téléphone/)).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("modifie le nom : PATCH accounts/me/, relecture, confirmation", async () => {
    const user = userEvent.setup();
    PATCH.mockResolvedValue(respond(200));
    render(<TeacherProfileCard identity={IDENTITY} />);
    await user.click(screen.getByRole("button", { name: /Modifier/ }));
    expect(screen.getByText(/est celui de votre invitation/)).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/Prénom/));
    await user.type(screen.getByLabelText(/Prénom/), "Kofi");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() =>
      expect(PATCH).toHaveBeenCalledWith("/api/accounts/me/", { body: { firstName: "Kofi", lastName: "Adékambi" } }),
    );
    expect(router.refresh).toHaveBeenCalled();
    expect(await screen.findByText("Vos informations sont enregistrées.")).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Mes informations" })).toBeNull();
  });

  it("champs vides : erreurs sous les champs, aucun appel", async () => {
    const user = userEvent.setup();
    render(<TeacherProfileCard identity={{ ...IDENTITY, school: null }} />);
    await user.click(screen.getByRole("button", { name: /Modifier/ }));
    expect(screen.getByText(/non renseigné\)/)).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/Prénom/));
    await user.clear(screen.getByLabelText(/^Nom/));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findAllByText("Indiquez votre prénom.")).not.toHaveLength(0);
    expect(screen.getAllByText("Indiquez votre nom.")).not.toHaveLength(0);
    expect(PATCH).not.toHaveBeenCalled();
  });

  it("erreur du serveur sur un champ, puis erreur générale au vouvoiement ; annuler ferme le formulaire", async () => {
    const user = userEvent.setup();
    PATCH.mockResolvedValueOnce(failure(400, "VALIDATION_ERROR", { firstName: "Ce prénom est trop long." }));
    PATCH.mockResolvedValueOnce(failure(500, "SERVER_ERROR"));
    render(<TeacherProfileCard identity={IDENTITY} />);
    await user.click(screen.getByRole("button", { name: /Modifier/ }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect((await screen.findAllByText("Ce prénom est trop long.")).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect((await screen.findAllByText(/Réessayez dans quelques instants/)).length).toBeGreaterThan(0);
    expect(router.refresh).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByText("Koffi Adékambi")).toBeInTheDocument();
  });
});

describe("TeacherConnectionCard (WT08, connexion)", () => {
  it("email et mot de passe, jamais de téléphone", async () => {
    const { container } = render(<TeacherConnectionCard email="koffi@steamy.test" />);
    expect(screen.getByText("koffi@steamy.test")).toBeInTheDocument();
    expect(screen.queryByText(/téléphone/i)).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sans email lisible, la valeur absente est signalée", () => {
    render(<TeacherConnectionCard email={null} />);
    expect(screen.getByText("Non renseigné")).toBeInTheDocument();
  });

  it("change l'adresse avec le mot de passe actuel : POST accounts/me/email/, relecture, confirmation", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(respond(204));
    render(<TeacherConnectionCard email="koffi@steamy.test" />);
    await user.click(screen.getByRole("button", { name: /Changer d'adresse/ }));
    await user.type(screen.getByLabelText(/Nouvelle adresse email/), "nouveau@steamy.test");
    await user.type(screen.getByLabelText(/Mot de passe actuel/), "Steamy2026");
    await user.click(screen.getByRole("button", { name: "Enregistrer l'adresse" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/api/accounts/me/email/", {
        body: { email: "nouveau@steamy.test", password: "Steamy2026" },
      }),
    );
    expect(router.refresh).toHaveBeenCalled();
    expect(await screen.findByText(/Votre adresse est modifiée/)).toBeInTheDocument();
  });

  it("champs vides : erreurs, aucun appel", async () => {
    const user = userEvent.setup();
    render(<TeacherConnectionCard email="koffi@steamy.test" />);
    await user.click(screen.getByRole("button", { name: /Changer d'adresse/ }));
    await user.click(screen.getByRole("button", { name: "Enregistrer l'adresse" }));
    expect((await screen.findAllByText("Indiquez votre nouvelle adresse email.")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Indiquez votre mot de passe actuel.").length).toBeGreaterThan(0);
    expect(POST).not.toHaveBeenCalled();
  });

  it.each([
    [failure(400, "EMAIL_TAKEN"), "Cette adresse est déjà utilisée par un autre compte."],
    [failure(400, "INVALID_CREDENTIALS"), "Mot de passe incorrect."],
    [failure(400, "VALIDATION_ERROR", { email: "Adresse invalide." }), "Adresse invalide."],
    [failure(500, "SERVER_ERROR"), "Une erreur est survenue de notre côté. Réessayez dans quelques instants."],
  ])("erreur du serveur %#", async (response, text) => {
    const user = userEvent.setup();
    POST.mockResolvedValue(response);
    render(<TeacherConnectionCard email="koffi@steamy.test" />);
    await user.click(screen.getByRole("button", { name: /Changer d'adresse/ }));
    await user.type(screen.getByLabelText(/Nouvelle adresse email/), "a@steamy.test");
    await user.type(screen.getByLabelText(/Mot de passe actuel/), "x");
    await user.click(screen.getByRole("button", { name: "Enregistrer l'adresse" }));
    expect((await screen.findAllByText(text)).length).toBeGreaterThan(0);
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("annuler le changement d'adresse", async () => {
    const user = userEvent.setup();
    render(<TeacherConnectionCard email="koffi@steamy.test" />);
    await user.click(screen.getByRole("button", { name: /Changer d'adresse/ }));
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByText("koffi@steamy.test")).toBeInTheDocument();
  });

  it("mot de passe : formulaire D25 au vouvoiement, puis « Fermer »", async () => {
    const user = userEvent.setup();
    render(<TeacherConnectionCard email="koffi@steamy.test" />);
    await user.click(screen.getByRole("button", { name: "Changer de mot de passe" }));
    expect(screen.getByRole("button", { name: "Mettre à jour le mot de passe" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Changer de mot de passe" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.getByRole("button", { name: "Changer de mot de passe" })).toBeInTheDocument();
  });
});

describe("CloseAccount (WT08, zone sensible)", () => {
  async function openDialog() {
    const user = userEvent.setup();
    render(<CloseAccount name="Koffi Adékambi" email="koffi@steamy.test" />);
    await user.click(screen.getByRole("button", { name: "Demander la fermeture du compte" }));
    return { user, dialog: screen.getByRole("dialog") };
  }

  it("explique le traitement par l'équipe, sans suppression immédiate", async () => {
    const { container } = render(<CloseAccount name="Koffi Adékambi" email="koffi@steamy.test" />);
    expect(screen.getByText(CLOSE_ACCOUNT_TEXT)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("envoie la demande au support (sujet « Autre » prérempli), puis confirme et rend le focus", async () => {
    POST.mockResolvedValue(respond(201));
    const { user, dialog } = await openDialog();
    await user.click(within(dialog).getByRole("button", { name: "Envoyer la demande" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/api/public/contact-messages/", {
        body: {
          name: "Koffi Adékambi",
          contact: "koffi@steamy.test",
          subject: "autre",
          message: "Demande de fermeture du compte enseignant de Koffi Adékambi (koffi@steamy.test).",
        },
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const status = screen.getByText(/Votre demande est envoyée/);
    expect(status).toHaveFocus();
    expect(screen.getByRole("button", { name: "Demander la fermeture du compte" })).toBeDisabled();
  });

  it("un double clic n'envoie qu'une demande", async () => {
    let finish: (value: unknown) => void = () => {};
    POST.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    const { user, dialog } = await openDialog();
    const send = within(dialog).getByRole("button", { name: "Envoyer la demande" });
    await user.dblClick(send);
    expect(POST).toHaveBeenCalledTimes(1);
    await act(async () => finish(respond(201)));
  });

  it("l'erreur reste affichée dans la fenêtre et un réessai est possible", async () => {
    POST.mockResolvedValueOnce(failure(500, "SERVER_ERROR"));
    POST.mockResolvedValueOnce(respond(201));
    const { user, dialog } = await openDialog();
    await user.click(within(dialog).getByRole("button", { name: "Envoyer la demande" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/Réessayez dans quelques instants/);
    await user.click(within(dialog).getByRole("button", { name: "Envoyer la demande" }));
    await waitFor(() => expect(screen.getByText(/Votre demande est envoyée/)).toBeInTheDocument());
    expect(POST).toHaveBeenCalledTimes(2);
  });

  it("annuler ferme la fenêtre sans rien envoyer et efface l'erreur", async () => {
    POST.mockResolvedValue(failure(500, "SERVER_ERROR"));
    const { user, dialog } = await openDialog();
    await user.click(within(dialog).getByRole("button", { name: "Envoyer la demande" }));
    await within(dialog).findByRole("alert");
    await user.click(within(dialog).getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Demander la fermeture du compte" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("TeacherSettings (WT08)", () => {
  const PREFS = {
    emailAddress: "koffi@steamy.test",
    categories: [{ category: "progress", label: "Progression", inApp: true, email: true }],
  };

  it("lit l'utilisateur, l'établissement et les préférences ; sections de §5.12", async () => {
    getCurrentUser.mockResolvedValue({ firstName: "Koffi", lastName: "Adékambi", email: "koffi@steamy.test" });
    GET.mockImplementation(async (path: string) =>
      path.includes("school") ? { data: { name: "Collège Les Palmiers" }, response: new Response(null, { status: 200 }) } : { data: PREFS, response: new Response(null, { status: 200 }) },
    );
    const { container } = render(await TeacherSettings());
    for (const title of ["Profil", "Connexion", "Notifications", "Légal", "Zone sensible"]) {
      expect(screen.getByRole("heading", { level: 2, name: title })).toBeInTheDocument();
    }
    expect(screen.getByText("Collège Les Palmiers")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Politique de confidentialité" })).toHaveAttribute(
      "href",
      "/legal/confidentialite",
    );
    expect(screen.getByRole("button", { name: "Demander la fermeture du compte" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sans session ou sans lecture, ne rend rien", async () => {
    getCurrentUser.mockResolvedValue(null);
    GET.mockResolvedValue({ data: {}, response: new Response(null, { status: 200 }) });
    expect(await TeacherSettings()).toBeNull();
    getCurrentUser.mockResolvedValue({ firstName: "K", lastName: "A", email: null });
    GET.mockResolvedValue({ response: new Response(null, { status: 401 }) });
    expect(await TeacherSettings()).toBeNull();
  });

  it("sans email, la demande de fermeture part avec une coordonnée vide", async () => {
    getCurrentUser.mockResolvedValue({ firstName: "Koffi", lastName: "Adékambi", email: null });
    GET.mockImplementation(async (path: string) =>
      path.includes("school") ? { data: { name: "École" }, response: new Response(null, { status: 200 }) } : { data: PREFS, response: new Response(null, { status: 200 }) },
    );
    render(await TeacherSettings());
    expect(screen.getByRole("button", { name: "Demander la fermeture du compte" })).toBeInTheDocument();
  });

  it("squelette accessible", async () => {
    const { container } = render(<TeacherSettingsSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de vos paramètres…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
