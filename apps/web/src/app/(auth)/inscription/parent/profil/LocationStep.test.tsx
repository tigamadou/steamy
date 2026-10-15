import { render, screen, waitFor } from "@testing-library/react";
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

const { LocationStep } = await import("./LocationStep");

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const failure = (status: number, code: string, fields?: Record<string, string>) =>
  respond(status, {
    error: {
      code,
      message: "",
      fields: fields && Object.fromEntries(Object.entries(fields).map(([name, text]) => [name, [{ message: text }]])),
    },
  });

const country = () => screen.getByRole("combobox", { name: /Pays de résidence/ });
const locality = () => screen.getByRole("combobox", { name: /Localité/ });
const email = () => screen.getByRole("textbox", { name: /Email/ });
const send = () => userEvent.click(screen.getByRole("button", { name: "Suivant" }));

describe("LocationStep (WP07)", () => {
  beforeEach(() => {
    PATCH.mockReset();
    router.replace.mockReset();
    useReferential.mockClear();
    referentials.countries = { items: COUNTRIES, status: "ready", retry: vi.fn() };
    referentials.localities = { items: LOCALITIES, status: "ready", retry: vi.fn() };
  });

  it("exige la localité sans appeler l'API", async () => {
    render(<LocationStep />);
    await send();
    expect(await screen.findByRole("alert")).toHaveTextContent("Choisissez votre ville ou votre quartier.");
    expect(PATCH).not.toHaveBeenCalled();
  });

  it("affiche les localités avec et sans quartier", () => {
    render(<LocationStep />);
    expect(screen.getByRole("option", { name: "Cotonou · Akpakpa" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Parakou" })).toBeInTheDocument();
  });

  it("enregistre la localité et un email vide en null, puis passe à WP08", async () => {
    PATCH.mockResolvedValue(respond(200, { data: {} }));
    render(<LocationStep />);
    await userEvent.selectOptions(locality(), "12");
    await send();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/inscription/parent/profil/a-propos"));
    expect(PATCH).toHaveBeenCalledWith("/api/accounts/me/parent-profile/", { body: { locality: 12, email: null } });
  });

  it("envoie l'email saisi, sans espaces autour", async () => {
    PATCH.mockResolvedValue(respond(200, { data: {} }));
    render(<LocationStep />);
    await userEvent.selectOptions(locality(), "13");
    await userEvent.type(email(), "  koffi@example.com ");
    await send();
    await waitFor(() => expect(PATCH).toHaveBeenCalled());
    expect(PATCH.mock.calls[0][1].body).toEqual({ locality: 13, email: "koffi@example.com" });
  });

  it.each([
    [failure(400, "VALIDATION_ERROR", { email: "Email invalide." }), "Email invalide."],
    [failure(400, "VALIDATION_ERROR", { locality: "Localité inconnue." }), "Localité inconnue."],
    [failure(500, "SERVER_ERROR"), "Une erreur est survenue de notre côté. Réessayez dans quelques instants."],
  ])("affiche le refus de l'API (%#)", async (response, text) => {
    PATCH.mockResolvedValue(response);
    render(<LocationStep />);
    await userEvent.selectOptions(locality(), "12");
    await send();
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("recharge les localités du pays choisi", async () => {
    render(<LocationStep />);
    expect(country()).toHaveValue("BJ");
    expect(useReferential).toHaveBeenCalledWith("localities", { country: "BJ" });
    await userEvent.selectOptions(country(), "TG");
    expect(useReferential).toHaveBeenLastCalledWith("localities", { country: "TG" });
    expect(locality()).toHaveValue("");
  });

  it("montre le chargement des référentiels pas encore demandés et exige toujours la localité", async () => {
    referentials.countries = { items: undefined, status: "idle" };
    referentials.localities = { items: undefined, status: "idle" };
    render(<LocationStep />);
    expect(country()).toHaveAttribute("aria-busy", "true");
    expect(locality()).toBeDisabled();
    expect(locality()).toHaveAttribute("aria-busy", "true");
    await send();
    expect(await screen.findByRole("alert")).toHaveTextContent("Choisissez votre ville ou votre quartier.");
    expect(PATCH).not.toHaveBeenCalled();
  });

  it("propose de recharger les listes après un échec", async () => {
    referentials.countries = { items: undefined, status: "error", retry: vi.fn() };
    referentials.localities = { items: undefined, status: "error", retry: vi.fn() };
    render(<LocationStep />);
    const [retryCountries, retryLocalities] = screen.getAllByRole("button", { name: "Réessayer" });
    await userEvent.click(retryCountries);
    await userEvent.click(retryLocalities);
    expect(referentials.countries.retry).toHaveBeenCalled();
    expect(referentials.localities.retry).toHaveBeenCalled();
  });

  it("ne présente aucune violation d'accessibilité, même en erreur", async () => {
    const { container } = render(<LocationStep />);
    await send();
    await screen.findByRole("alert");
    expect(await axe(container)).toHaveNoViolations();
  });
});
