import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

const PATCH = vi.fn();
const router = { replace: vi.fn() };
const COUNTRIES = [
  { id: 1, code: "BJ", label: "Bénin" },
  { id: 2, code: "TG", label: "Togo" },
];
const LOCALITIES = [
  { id: 12, country: "BJ", city: "Cotonou", district: "Akpakpa", areaType: "urban" },
  { id: 13, country: "BJ", city: "Parakou", areaType: "urban" },
];
type Referential = { items?: object[]; status: string; retry?: () => void };
const referentials: Record<string, Referential> = {};
const useReferential = vi.fn<(name: string, options?: { country?: string }) => Referential>((name) => referentials[name]);
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ PATCH }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/use-referential", () => ({ useReferential }));

const { InfoStep } = await import("./InfoStep");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const failure = (status: number, code: string, message = "", fields?: Record<string, string>) =>
  respond(status, {
    error: {
      code,
      message,
      fields: fields && Object.fromEntries(Object.entries(fields).map(([name, text]) => [name, [{ message: text }]])),
    },
  });

const birthDate = () => screen.getByLabelText(/^Date de naissance/);
const country = () => screen.getByRole("combobox", { name: /Pays de résidence/ });
const locality = () => screen.getByRole("combobox", { name: /Localité/ });
const email = () => screen.getByRole("textbox", { name: /Email/ });
const send = () => userEvent.click(screen.getByRole("button", { name: "Suivant" }));

async function fill() {
  fireEvent.change(birthDate(), { target: { value: "2013-04-02" } });
  await userEvent.selectOptions(locality(), "12");
}

describe("InfoStep (W11)", () => {
  beforeEach(() => {
    PATCH.mockReset();
    router.replace.mockReset();
    useReferential.mockClear();
    referentials.countries = { items: COUNTRIES, status: "ready", retry: vi.fn() };
    referentials.localities = { items: LOCALITIES, status: "ready", retry: vi.fn() };
  });

  it("exige la date de naissance et la localité sans appeler l'API", async () => {
    render(<InfoStep />);
    await send();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Indique ta date de naissance.");
    expect(alert).toHaveTextContent("Choisis ta ville ou ton quartier.");
    expect(PATCH).not.toHaveBeenCalled();
  });

  it("exige la date seule quand la localité est choisie", async () => {
    render(<InfoStep />);
    await userEvent.selectOptions(locality(), "13");
    await send();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Indique ta date de naissance.");
    expect(alert).not.toHaveTextContent("Choisis ta ville ou ton quartier.");
  });

  it("affiche les localités avec et sans quartier", () => {
    render(<InfoStep />);
    expect(screen.getByRole("option", { name: "Cotonou · Akpakpa" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Parakou" })).toBeInTheDocument();
  });

  it("enregistre la localité en nombre et un email vide en null, puis passe à W12", async () => {
    PATCH.mockResolvedValue(respond(200, { data: { profileStep: "learner-school" } }));
    render(<InfoStep />);
    await fill();
    await send();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inscription/apprenant/profil/ecole"));
    expect(PATCH).toHaveBeenCalledWith("/api/accounts/me/learner-profile/", {
      body: { birthDate: "2013-04-02", locality: 12, email: null },
    });
  });

  it("envoie l'email saisi, sans espaces autour", async () => {
    PATCH.mockResolvedValue(respond(200, { data: { profileStep: "learner-school" } }));
    render(<InfoStep />);
    await fill();
    await userEvent.type(email(), "  awa@example.com ");
    await send();
    await waitFor(() => expect(PATCH).toHaveBeenCalled());
    expect(PATCH.mock.calls[0][1].body.email).toBe("awa@example.com");
  });

  it.each([
    [failure(400, "BIRTHDATE_AGE_MISMATCH"), "Cette date ne correspond pas à l'âge indiqué au début de ton inscription."],
    [failure(400, "AGE_OUT_OF_RANGE"), "Steamy est fait pour les 10 à 17 ans."],
    [failure(400, "AGE_OUT_OF_RANGE", "", { birthDate: "Tu dois avoir entre 10 et 17 ans." }), "Tu dois avoir entre 10 et 17 ans."],
    [failure(400, "VALIDATION_ERROR", "", { birthDate: "Date invalide." }), "Date invalide."],
    [failure(400, "VALIDATION_ERROR", "", { email: "Email invalide." }), "Email invalide."],
    [failure(400, "VALIDATION_ERROR", "", { locality: "Localité inconnue." }), "Localité inconnue."],
    [failure(500, "SERVER_ERROR"), "Une erreur est survenue de notre côté. Réessaie dans quelques instants."],
  ])("affiche le refus de l'API (%#)", async (response, text) => {
    PATCH.mockResolvedValue(response);
    render(<InfoStep />);
    await fill();
    await send();
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("recharge les localités du pays choisi", async () => {
    render(<InfoStep />);
    expect(country()).toHaveValue("BJ");
    expect(useReferential).toHaveBeenCalledWith("localities", { country: "BJ" });
    await userEvent.selectOptions(country(), "TG");
    expect(useReferential).toHaveBeenLastCalledWith("localities", { country: "TG" });
    expect(locality()).toHaveValue("");
  });

  it("montre le chargement des référentiels pas encore demandés", async () => {
    referentials.countries = { items: undefined, status: "idle" };
    referentials.localities = { items: undefined, status: "idle" };
    render(<InfoStep />);
    expect(country()).toHaveAttribute("aria-busy", "true");
    expect(locality()).toBeDisabled();
    expect(locality()).toHaveAttribute("aria-busy", "true");
    fireEvent.change(birthDate(), { target: { value: "2013-04-02" } });
    await send();
    expect(await screen.findByRole("alert")).toHaveTextContent("Choisis ta ville ou ton quartier.");
    expect(PATCH).not.toHaveBeenCalled();
  });

  it("montre un chargement en cours", () => {
    referentials.countries = { items: undefined, status: "loading" };
    referentials.localities = { items: undefined, status: "loading" };
    render(<InfoStep />);
    expect(country()).toHaveAttribute("aria-busy", "true");
    expect(locality()).toHaveAttribute("aria-busy", "true");
  });

  it("propose de recharger les listes après un échec", async () => {
    referentials.countries = { items: undefined, status: "error", retry: vi.fn() };
    referentials.localities = { items: undefined, status: "error", retry: vi.fn() };
    render(<InfoStep />);
    const [retryCountries, retryLocalities] = screen.getAllByRole("button", { name: "Réessayer" });
    await userEvent.click(retryCountries);
    await userEvent.click(retryLocalities);
    expect(referentials.countries.retry).toHaveBeenCalled();
    expect(referentials.localities.retry).toHaveBeenCalled();
  });

  it("ne présente aucune violation d'accessibilité, même en erreur", async () => {
    const { container } = render(<InfoStep />);
    await send();
    await screen.findByRole("alert");
    expect(await axe(container)).toHaveNoViolations();
  });
});
