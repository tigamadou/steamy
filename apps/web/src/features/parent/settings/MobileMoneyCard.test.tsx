import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetReferentials } from "@/lib/use-referential";
import { axe } from "@/test/axe";

const GET = vi.fn();
const PATCH = vi.fn();
const router = { refresh: vi.fn() };
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ GET, PATCH }) }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { MobileMoneyCard, nationalOf } = await import("./MobileMoneyCard");

const COUNTRIES = [
  { code: "BJ", label: "Bénin", dialCode: "229", phoneFormat: "XX XX XX XX XX", phoneRegex: "^01[0-9]{8}$" },
  { code: "TG", label: "Togo", dialCode: "228", phoneFormat: "XX XX XX XX", phoneRegex: "^[279][0-9]{7}$" },
];
const NETWORKS: Record<string, object[]> = {
  BJ: [
    { id: 1, code: "mtn", label: "MTN MoMo", country: "BJ" },
    { id: 2, code: "moov", label: "Moov Money", country: "BJ" },
  ],
  TG: [{ id: 3, code: "flooz", label: "Flooz", country: "TG" }],
};
const SAVED = { country: "BJ", network: "mtn", phone: "+2290190000001" };

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const failure = (status: number, code: string, fields?: Record<string, string>) =>
  respond(status, {
    error: {
      code,
      message: "",
      fields: fields && Object.fromEntries(Object.entries(fields).map(([name, text]) => [name, [{ message: text }]])),
    },
  });

const network = () => screen.getByRole("combobox", { name: /^Réseau/ });
const number = () => screen.getByRole("textbox", { name: /^Numéro Mobile Money/ });

describe("MobileMoneyCard (WPD08, D76)", () => {
  beforeEach(() => {
    resetReferentials();
    PATCH.mockReset();
    router.refresh.mockReset();
    GET.mockReset().mockImplementation(async (_: string, init: { params: { query?: { country: string } } }) =>
      respond(200, { data: NETWORKS[init.params.query?.country ?? ""] ?? [] }),
    );
  });

  it("affiche le compte enregistré avec le libellé du réseau, puis le modifie", async () => {
    const user = userEvent.setup();
    PATCH.mockResolvedValue(respond(200, { data: {} }));
    const { container } = render(<MobileMoneyCard value={SAVED} countries={COUNTRIES} />);
    expect(await screen.findByText("MTN MoMo")).toBeInTheDocument();
    expect(screen.getByText("Bénin")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole("button", { name: /^Modifier/ }));
    await waitFor(() => expect(network()).toHaveValue("mtn"));
    await user.selectOptions(network(), "moov");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(PATCH).toHaveBeenCalledWith("/api/accounts/me/parent-profile/", {
      body: { mobileMoney: { country: "BJ", network: "moov", phone: "+2290190000001" } },
    });
    expect(await screen.findByText("Votre Mobile Money préféré est enregistré.")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalled();
  });

  it("sans compte : pays par défaut, réseau et numéro requis ; changer de pays vide le réseau", async () => {
    const user = userEvent.setup();
    render(<MobileMoneyCard value={null} countries={COUNTRIES} />);
    expect(screen.getAllByText("Non renseigné")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: /^Modifier/ }));
    expect(screen.queryByRole("button", { name: "Retirer ce compte" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Saisissez un numéro Mobile Money valide pour ce pays.");
    expect(summary).toHaveTextContent("Choisissez votre réseau Mobile Money.");
    expect(PATCH).not.toHaveBeenCalled();

    await waitFor(() => expect(screen.getByRole("option", { name: "Moov Money" })).toBeInTheDocument());
    await user.selectOptions(network(), "moov");
    await user.selectOptions(screen.getByRole("combobox", { name: "Pays du compte Mobile Money" }), "TG");
    await waitFor(() => expect(screen.getByRole("option", { name: "Flooz" })).toBeInTheDocument());
    expect(network()).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByRole("button", { name: /^Modifier/ })).toBeInTheDocument();
  });

  it("erreurs de l'API au champ ou en message ; « Retirer ce compte » envoie null", async () => {
    const user = userEvent.setup();
    render(<MobileMoneyCard value={SAVED} countries={COUNTRIES} />);
    await user.click(screen.getByRole("button", { name: /^Modifier/ }));
    await waitFor(() => expect(network()).toHaveValue("mtn"));
    expect(number()).toHaveValue("01 90 00 00 01");

    PATCH.mockResolvedValueOnce(failure(400, "VALIDATION_ERROR", { network: "Réseau inactif." }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByRole("link", { name: "Réseau inactif." })).toHaveAttribute("href", "#mobile-money-reseau");

    PATCH.mockResolvedValueOnce(failure(500, "SERVER_ERROR"));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Réessayez dans quelques instants."));

    PATCH.mockResolvedValueOnce(respond(200, { data: {} }));
    await user.click(screen.getByRole("button", { name: "Retirer ce compte" }));
    expect(PATCH).toHaveBeenLastCalledWith("/api/accounts/me/parent-profile/", { body: { mobileMoney: null } });
  });

  it("modifier, annuler, rouvrir, enregistrer : seule la valeur enregistrée repart au serveur", async () => {
    const user = userEvent.setup();
    PATCH.mockResolvedValue(respond(200, { data: {} }));
    render(<MobileMoneyCard value={SAVED} countries={COUNTRIES} />);
    await user.click(screen.getByRole("button", { name: /^Modifier/ }));
    await waitFor(() => expect(network()).toHaveValue("mtn"));
    // Changement annulé : autre pays, autre numéro
    await user.selectOptions(screen.getByRole("combobox", { name: "Pays du compte Mobile Money" }), "TG");
    await user.type(number(), "90000000");
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    await user.click(screen.getByRole("button", { name: /^Modifier/ }));
    await waitFor(() => expect(network()).toHaveValue("mtn"));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(PATCH).toHaveBeenCalledWith("/api/accounts/me/parent-profile/", { body: { mobileMoney: SAVED } });
  });

  it("après « Retirer ce compte », la réouverture ne renvoie pas l'ancien numéro", async () => {
    const user = userEvent.setup();
    PATCH.mockResolvedValue(respond(200, { data: {} }));
    const { rerender } = render(<MobileMoneyCard value={SAVED} countries={COUNTRIES} />);
    await user.click(screen.getByRole("button", { name: /^Modifier/ }));
    await user.click(screen.getByRole("button", { name: "Retirer ce compte" }));
    // La page relue renvoie un compte effacé
    rerender(<MobileMoneyCard value={null} countries={COUNTRIES} />);
    await user.click(await screen.findByRole("button", { name: /^Modifier/ }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Saisissez un numéro Mobile Money valide");
    expect(PATCH).toHaveBeenCalledTimes(1);
  });

  it("nationalOf : numéro national d'un E.164 du pays", () => {
    expect(nationalOf("+2290190000001", COUNTRIES[0])).toBe("0190000001");
    expect(nationalOf("+22890000000", COUNTRIES[0])).toBe("");
    expect(nationalOf("+2290190000001", undefined)).toBe("");
  });

  it("pays enregistré inconnu de la liste : son code est affiché", async () => {
    render(<MobileMoneyCard value={{ country: "SN", network: "wave", phone: "+221700000000" }} countries={COUNTRIES} />);
    expect(screen.getByText("SN")).toBeInTheDocument();
    expect(await screen.findByText("wave")).toBeInTheDocument();
  });
});
