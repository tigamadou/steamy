import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const POST = vi.fn();
const PATCH = vi.fn();
const GET = vi.fn();
const router = { refresh: vi.fn(), replace: vi.fn() };
const getCurrentUser = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST, PATCH }) }));
vi.mock("@/lib/api", () => ({ getServerApi: async () => ({ GET }) }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock("@/lib/referentials", () => ({ getCountries: async () => COUNTRIES }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/features/account/api", () => ({ getDeliveryAddress: async () => null }));
vi.mock("@/features/account/DeliveryForm", () => ({ DeliveryForm: () => <p>Adresse de livraison</p> }));
vi.mock("./MobileMoneyCard", () => ({ MobileMoneyCard: () => <p>Mobile Money</p> }));

const COUNTRIES = [
  { code: "BJ", label: "Bénin", dialCode: "229", phoneFormat: "XX XX XX XX XX", phoneRegex: "^01[0-9]{8}$" },
];

const { ProfileCard } = await import("./ProfileCard");
const { ConnectionCard } = await import("./ConnectionCard");
const { DangerZone, ACCOUNT_DELETION_TEXT } = await import("./DangerZone");
const { ParentSettings, ParentSettingsSkeleton } = await import("./ParentSettings");

const respond = (status: number, body: object = {}, headers: Record<string, string> = {}) => ({
  ...body,
  response: new Response(null, { status, headers }),
});
const failure = (status: number, code: string, fields?: Record<string, string>) =>
  respond(status, {
    error: {
      code,
      message: "",
      fields: fields && Object.fromEntries(Object.entries(fields).map(([name, text]) => [name, [{ message: text }]])),
    },
  });

const IDENTITY = {
  firstName: "Marie",
  lastName: "Adjovi",
  phone: "+2290190000001",
  email: "marie.adjovi@steamy.test",
  profession: "Infirmière",
};

beforeEach(() => {
  POST.mockReset();
  PATCH.mockReset();
  GET.mockReset();
  router.refresh.mockReset();
  router.replace.mockReset();
});

describe("ProfileCard (WPD08, profil)", () => {
  it("affiche le profil lu dans l'API, puis l'enregistre (me, puis parent-profile)", async () => {
    const user = userEvent.setup();
    PATCH.mockResolvedValue(respond(200, { data: {} }));
    const { container } = render(<ProfileCard identity={IDENTITY} />);
    expect(screen.getByText("Marie Adjovi")).toBeInTheDocument();
    expect(screen.getByText("Infirmière")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole("button", { name: /^Modifier/ }));
    const email = screen.getByRole("textbox", { name: /^Email/ });
    expect(email).toHaveAccessibleDescription(/rapport hebdomadaire/);
    await user.clear(email);
    await user.clear(screen.getByRole("textbox", { name: /^Profession/ }));
    await user.type(screen.getByRole("textbox", { name: /^Profession/ }), "Comptable");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() =>
      expect(PATCH).toHaveBeenCalledWith("/api/accounts/me/parent-profile/", {
        body: { email: null, profession: "Comptable" },
      }),
    );
    expect(PATCH).toHaveBeenCalledWith("/api/accounts/me/", { body: { firstName: "Marie", lastName: "Adjovi" } });
    expect(await screen.findByText("Vos informations sont enregistrées.")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalled();
    expect(screen.queryByRole("form", { name: "Mes informations" })).toBeNull();
  });

  it("prénom et nom requis, sans appel à l'API ; « Annuler » referme", async () => {
    const user = userEvent.setup();
    render(<ProfileCard identity={{ ...IDENTITY, email: null, phone: null }} />);
    expect(screen.getAllByText("Non renseigné")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: /^Modifier/ }));
    await user.clear(screen.getByRole("textbox", { name: /^Prénom/ }));
    await user.clear(screen.getByRole("textbox", { name: /^Nom/ }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Indiquez votre prénom.");
    expect(summary).toHaveTextContent("Indiquez votre nom.");
    expect(summary).toHaveTextContent("Corrigez les erreurs suivantes :");
    expect(PATCH).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByRole("button", { name: /^Modifier/ })).toBeInTheDocument();
  });

  it("erreurs de l'API : au champ, sinon message", async () => {
    const user = userEvent.setup();
    PATCH.mockResolvedValueOnce(respond(200, { data: {} })).mockResolvedValueOnce(
      failure(400, "VALIDATION_ERROR", { email: "Adresse email invalide.", other: "x" }),
    );
    render(<ProfileCard identity={IDENTITY} />);
    await user.click(screen.getByRole("button", { name: /^Modifier/ }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("textbox", { name: /^Email/ })).toHaveAccessibleDescription("Adresse email invalide.");

    PATCH.mockResolvedValueOnce(failure(500, "SERVER_ERROR"));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Réessayez dans quelques instants."));
    expect(PATCH).toHaveBeenCalledTimes(3);
    expect(screen.getByRole("alert")).not.toHaveTextContent("Votre nom est enregistré");
  });

  it("nom enregistré mais second PATCH en échec : nom relu, l'erreur dit ce qui manque", async () => {
    const user = userEvent.setup();
    PATCH.mockResolvedValueOnce(respond(200, { data: {} })).mockResolvedValueOnce(failure(500, "SERVER_ERROR"));
    render(<ProfileCard identity={IDENTITY} />);
    await user.click(screen.getByRole("button", { name: /^Modifier/ }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /Votre nom est enregistré, mais pas l.email ni la profession\. .*Réessayez dans quelques instants\./,
      ),
    );
    expect(router.refresh).toHaveBeenCalledTimes(1);
    // Le formulaire reste ouvert pour réessayer
    expect(screen.getByRole("form", { name: "Mes informations" })).toBeInTheDocument();
  });
});

describe("ConnectionCard (WPD08, connexion)", () => {
  const challenge = { challengeId: "ch-1", destinationMasked: "+229 01 •• •• 02", expiresInSec: 600, resendInSec: 0 };

  async function askCode(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: /^Changer de numéro/ }));
    await user.type(screen.getByRole("textbox", { name: /^Nouveau numéro/ }), "0190000002");
    await user.type(screen.getByLabelText(/^Mot de passe actuel/), "Steamy2026");
    await user.click(screen.getByRole("button", { name: "Recevoir le code" }));
  }

  it("changement de numéro : code sur le nouveau numéro, puis validation (D24)", async () => {
    const user = userEvent.setup();
    POST.mockImplementation(async (path: string) =>
      path === "/api/accounts/me/phone-change/" ? respond(200, { data: challenge }) : respond(200, { data: {} }),
    );
    const { container } = render(<ConnectionCard phone="+2290190000001" countries={COUNTRIES} />);
    expect(screen.getByText("+2290190000001")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    await askCode(user);
    expect(POST).toHaveBeenCalledWith("/api/accounts/me/phone-change/", {
      body: { phone: "+2290190000002", password: "Steamy2026" },
    });
    expect(await screen.findByText("+229 01 •• •• 02")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: /Code à 6 chiffres/ }), "123456");
    await user.click(screen.getByRole("button", { name: "Valider le nouveau numéro" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/api/accounts/me/phone-change/verify/", {
        body: { challengeId: "ch-1", code: "123456" },
      }),
    );
    expect(await screen.findByText(/Votre numéro est modifié/)).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalled();
  });

  it("OTP_INVALID au code, OTP_RESEND_TOO_EARLY au renvoi, retour à la saisie du numéro", async () => {
    const user = userEvent.setup();
    POST.mockImplementation(async (path: string) => {
      if (path === "/api/accounts/me/phone-change/") return respond(200, { data: challenge });
      if (path === "/api/auth/otp/resend/") {
        return respond(429, { error: { code: "OTP_RESEND_TOO_EARLY", message: "" } }, { "Retry-After": "0" });
      }
      return failure(400, "OTP_INVALID");
    });
    render(<ConnectionCard phone="+2290190000001" countries={COUNTRIES} />);
    await askCode(user);
    await user.type(await screen.findByRole("textbox", { name: /Code à 6 chiffres/ }), "000000");
    await user.click(screen.getByRole("button", { name: "Valider le nouveau numéro" }));
    expect(await screen.findByText("Code incorrect. Vérifiez le message reçu.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Renvoyer le code" }));
    expect(await screen.findByText("Patientez encore un peu avant de demander un nouveau code.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Modifier le numéro" }));
    expect(screen.getByRole("form", { name: "Changer de numéro" })).toBeInTheDocument();
  });

  it("champs requis, puis erreurs de l'API au champ ou en message", async () => {
    const user = userEvent.setup();
    render(<ConnectionCard phone={null} countries={COUNTRIES} />);
    await user.click(screen.getByRole("button", { name: /^Changer de numéro/ }));
    await user.click(screen.getByRole("button", { name: "Recevoir le code" }));
    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Saisissez un numéro valide pour ce pays.");
    expect(summary).toHaveTextContent("Indiquez votre mot de passe actuel.");
    expect(POST).not.toHaveBeenCalled();

    await user.type(screen.getByRole("textbox", { name: /^Nouveau numéro/ }), "0190000002");
    await user.type(screen.getByLabelText(/^Mot de passe actuel/), "Steamy2026");
    for (const [answer, text] of [
      [failure(409, "PHONE_TAKEN"), "Ce numéro est déjà utilisé par un autre compte."],
      [failure(400, "VALIDATION_ERROR", { password: "Mot de passe incorrect." }), "Mot de passe incorrect."],
      [failure(400, "INVALID_CREDENTIALS"), "Mot de passe incorrect."],
      [failure(400, "VALIDATION_ERROR", { phone: "C'est déjà votre numéro." }), "C'est déjà votre numéro."],
      [failure(500, "SERVER_ERROR"), "Réessayez dans quelques instants."],
    ] as const) {
      POST.mockResolvedValueOnce(answer);
      await user.click(screen.getByRole("button", { name: "Recevoir le code" }));
      await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(text));
    }
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("form", { name: "Changer de numéro" })).toBeNull();
  });

  it("changement de mot de passe au vouvoiement, puis « Fermer »", async () => {
    const user = userEvent.setup();
    render(<ConnectionCard phone="+2290190000001" countries={COUNTRIES} />);
    await user.click(screen.getByRole("button", { name: "Changer de mot de passe" }));
    expect(screen.getByLabelText(/^Confirmez votre nouveau mot de passe/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Changer de mot de passe" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.getByRole("button", { name: "Changer de mot de passe" })).toBeInTheDocument();
  });
});

describe("DangerZone (WPD08, D54)", () => {
  it("désactivée tant qu'un enfant est rattaché, avec le renvoi vers le support", async () => {
    const { container } = render(<DangerZone childrenCount={2} />);
    const button = screen.getByRole("button", { name: "Supprimer" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(/Supprimez d'abord le compte de chacun de vos enfants/);
    expect(screen.getByRole("link", { name: "contactant le support" })).toHaveAttribute(
      "href",
      "/aide?sujet=changement-parent#contact",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sans enfant : texte D54, confirmation, puis compte désactivé et retour à l'accueil", async () => {
    const user = userEvent.setup();
    POST.mockResolvedValue(respond(201, { data: {} }));
    render(<DangerZone childrenCount={0} />);
    expect(ACCOUNT_DELETION_TEXT).not.toMatch(/définitivement|irréversible/i);
    expect(screen.getByText(ACCOUNT_DELETION_TEXT)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    const dialog = screen.getByRole("dialog", { name: "Supprimer votre compte ?" });
    await user.click(within(dialog).getByRole("button", { name: "Supprimer mon compte" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(POST).toHaveBeenCalledWith("/api/accounts/me/deletion-request/", { body: { note: "" } });
  });

  it("refus de l'API affiché dans la modale ; « Annuler » la ferme", async () => {
    const user = userEvent.setup();
    render(<DangerZone childrenCount={0} />);
    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    POST.mockResolvedValueOnce(failure(409, "CHILDREN_STILL_LINKED"));
    await user.click(screen.getByRole("button", { name: "Supprimer mon compte" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Des enfants sont encore rattachés");
    POST.mockResolvedValueOnce(failure(500, "SERVER_ERROR"));
    await user.click(screen.getByRole("button", { name: "Supprimer mon compte" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Réessayez dans quelques instants."));
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
    // Échap ferme aussi la modale
    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("ParentSettings (WPD08)", () => {
  const PROFILE = { email: "marie.adjovi@steamy.test", profession: "Infirmière", locality: null, mobileMoney: null };
  const PREFS = { emailAddress: "marie.adjovi@steamy.test", categories: [] };

  function routeApi(children: ReturnType<typeof respond>) {
    GET.mockImplementation(async (path: string) => {
      if (path === "/api/accounts/me/parent-profile/") return respond(200, { data: PROFILE });
      if (path === "/api/notifications/preferences/") return respond(200, { data: PREFS });
      return children;
    });
  }

  it("rend les sections du parent avec ses données", async () => {
    getCurrentUser.mockResolvedValue({ firstName: "Marie", lastName: "Adjovi", phone: "+2290190000001" });
    routeApi(respond(200, { data: { count: 2, results: [] } }));
    const { container } = render((await ParentSettings()) as ReactElement);
    expect(GET).toHaveBeenCalledWith("/api/accounts/children/", { params: { query: { pageSize: 1 } } });
    for (const name of ["Profil", "Livraison et paiement", "Notifications", "Légal", "Zone sensible"]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Mentions légales" })).toHaveAttribute("href", "/legal/mentions-legales");
    expect(screen.getByRole("button", { name: "Supprimer" })).toBeDisabled();
    expect(container.querySelector("#notifications")).not.toBeNull();
  });

  it("sans compte d'enfants dans la réponse, la suppression reste possible", async () => {
    getCurrentUser.mockResolvedValue({ firstName: "Afi", lastName: "Test", phone: null });
    PROFILE.locality = { country: "BJ" } as never;
    routeApi(respond(200, { data: { results: [] } }));
    render((await ParentSettings()) as ReactElement);
    expect(screen.getByRole("button", { name: "Supprimer" })).toBeEnabled();
  });

  it("session perdue : ne rend rien", async () => {
    getCurrentUser.mockResolvedValue(null);
    routeApi(respond(401));
    expect(await ParentSettings()).toBeNull();
  });

  it("squelette au vouvoiement", () => {
    render(<ParentSettingsSkeleton />);
    expect(screen.getByRole("status", { name: "Chargement de vos paramètres…" })).toBeInTheDocument();
  });
});
