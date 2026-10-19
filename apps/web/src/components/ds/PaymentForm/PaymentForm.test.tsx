import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetReferentials } from "@/lib/use-referential";
import { axe } from "@/test/axe";

import type { PhoneCountry } from "../PhoneInput";

const GET = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ GET }) }));

const { PaymentForm } = await import("./PaymentForm");

// Données au format des référentiels : aucun pays ni réseau n'est connu du composant
const COUNTRIES: PhoneCountry[] = [
  { code: "BJ", label: "Bénin", dialCode: "229", phoneFormat: "XX XX XX XX XX", phoneRegex: "^01[0-9]{8}$" },
  { code: "TG", label: "Togo", dialCode: "228", phoneFormat: "XX XX XX XX", phoneRegex: "^[279][0-9]{7}$" },
  { code: "CI", label: "Côte d'Ivoire", dialCode: "225", phoneRegex: "^0[0-9]{9}$" },
];
const NETWORKS: Record<string, { id: number; code: string; label: string; country: string }[]> = {
  BJ: [
    { id: 1, code: "reseau-a", label: "Réseau A", country: "BJ" },
    { id: 2, code: "reseau-b", label: "Réseau B", country: "BJ" },
  ],
  TG: [{ id: 3, code: "reseau-t", label: "Réseau T", country: "TG" }],
  CI: [],
};

function respond(country: string) {
  return { data: NETWORKS[country], response: new Response(null, { status: 200 }) };
}

beforeEach(() => {
  resetReferentials();
  GET.mockReset();
  GET.mockImplementation(async (_path: string, init: { params: { query: { country: string } } }) =>
    respond(init.params.query.country),
  );
});

describe("PaymentForm (WA03)", () => {
  it("affiche le montant du serveur et les réseaux actifs du pays, puis envoie le paiement", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ ok: true, data: {} });
    const { container } = render(<PaymentForm amount={18000} countries={COUNTRIES} onSubmit={onSubmit} />);
    expect(screen.getByRole("button", { name: /^Payer 18\s000\sF\sCFA$/ })).toBeInTheDocument();
    expect(screen.getByText("Paiement sécurisé · aucune carte bancaire")).toBeInTheDocument();
    expect(await screen.findByRole("radio", { name: "Réseau A" })).toBeInTheDocument();
    expect(GET).toHaveBeenCalledWith("/api/referentials/payment-networks/", { params: { query: { country: "BJ" } } });
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByText("Réseau B"));
    await user.type(screen.getByRole("textbox", { name: /Numéro Mobile Money/ }), "0190123401");
    await user.click(screen.getByRole("button", { name: /^Payer/ }));
    expect(onSubmit).toHaveBeenCalledWith({ country: "BJ", network: "reseau-b", msisdn: "+2290190123401" });
  });

  it("refuse l'envoi sans réseau ni numéro valide (vouvoiement par défaut)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PaymentForm amount={5000} countries={COUNTRIES} onSubmit={onSubmit} />);
    await screen.findByRole("radio", { name: "Réseau A" });
    await user.type(screen.getByRole("textbox", { name: /Numéro Mobile Money/ }), "0190");
    await user.click(screen.getByRole("button", { name: /^Payer/ }));
    expect(screen.getByText("Choisissez votre réseau Mobile Money.")).toBeInTheDocument();
    expect(screen.getByText("Saisissez un numéro Mobile Money valide pour ce pays.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("change de pays : réseaux du nouveau pays, choix et numéro remis à zéro ; pays sans réseau (tutoiement)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PaymentForm amount={5000} countries={COUNTRIES} register="tu" onSubmit={onSubmit} />);
    await user.click(await screen.findByText("Réseau A"));
    await user.selectOptions(screen.getByRole("combobox", { name: /^Pays/ }), "TG");
    expect(await screen.findByRole("radio", { name: "Réseau T" })).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: /^Payer/ }));
    expect(screen.getByText("Choisis ton réseau Mobile Money.")).toBeInTheDocument();
    expect(screen.getByText("Saisis un numéro Mobile Money valide pour ce pays.")).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: /^Pays/ }), "CI");
    expect(
      await screen.findByText("Aucun réseau Mobile Money n'est disponible pour ce pays. Choisis un autre pays."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Payer/ })).toBeDisabled();
  });

  it("réseaux illisibles : message et « Réessayer »", async () => {
    const user = userEvent.setup();
    GET.mockResolvedValueOnce({ data: undefined, response: new Response(null, { status: 500 }) });
    render(<PaymentForm amount={5000} countries={COUNTRIES} defaultCountry="TG" onSubmit={vi.fn()} />);
    expect(screen.getByText("Chargement des réseaux Mobile Money…")).toBeInTheDocument();
    expect(await screen.findByText("Impossible de charger les réseaux Mobile Money.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByRole("radio", { name: "Réseau T" })).toBeInTheDocument();
  });

  it("affiche les erreurs de l'API par champ, sinon son message", async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Certaines informations sont invalides.",
        fields: { msisdn: "Ce numéro n'est pas un numéro de ce pays." },
      })
      .mockResolvedValueOnce({ ok: false, code: "NETWORK_UNAVAILABLE", message: "", fields: {} });
    render(<PaymentForm amount={5000} countries={COUNTRIES} onSubmit={onSubmit} />);
    await user.click(await screen.findByText("Réseau A"));
    await user.type(screen.getByRole("textbox", { name: /Numéro Mobile Money/ }), "0190123401");
    await user.click(screen.getByRole("button", { name: /^Payer/ }));
    expect(await screen.findByText("Ce numéro n'est pas un numéro de ce pays.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Payer/ }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Le serveur est injoignable. Vérifiez votre connexion internet puis réessayez.",
      ),
    );
  });

  it("THROTTLED : « Payer » bloqué le temps annoncé par l'API, avec compte à rebours", async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, code: "THROTTLED", message: "", fields: {}, retryAfter: 30 });
    render(<PaymentForm amount={5000} countries={COUNTRIES} onSubmit={onSubmit} />);
    await user.click(await screen.findByText("Réseau A"));
    await user.type(screen.getByRole("textbox", { name: /Numéro Mobile Money/ }), "0190123401");
    await user.click(screen.getByRole("button", { name: /^Payer/ }));
    expect(await screen.findByRole("button", { name: "Réessayer dans 0:30" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("30 secondes");
  });
});

describe("PaymentForm · Mobile Money préféré et double clic (WPD15)", () => {
  it("préremplit pays, réseau et numéro du Mobile Money préféré ; « Payer » en magenta (C1)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ ok: true, data: {} });
    render(
      <PaymentForm
        amount={18000}
        countries={COUNTRIES}
        preferred={{ country: "TG", network: "reseau-t", phone: "+22890000000" }}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByRole("combobox", { name: /^Pays/ })).toHaveValue("TG");
    expect(await screen.findByRole("radio", { name: "Réseau T" })).toBeChecked();
    expect(screen.getByRole("textbox", { name: /Numéro Mobile Money/ })).toHaveValue("90 00 00 00");
    const pay = screen.getByRole("button", { name: /^Payer/ });
    expect(pay.className).toContain("bg-primary-500");
    await user.click(pay);
    expect(onSubmit).toHaveBeenCalledWith({ country: "TG", network: "reseau-t", msisdn: "+22890000000" });
  });

  it("numéro préféré d'un autre pays que l'indicatif : non prérempli", async () => {
    render(
      <PaymentForm
        amount={18000}
        countries={COUNTRIES}
        preferred={{ country: "BJ", network: "reseau-a", phone: "+22890000000" }}
        onSubmit={vi.fn()}
      />,
    );
    expect(await screen.findByRole("radio", { name: "Réseau A" })).toBeChecked();
    expect(screen.getByRole("textbox", { name: /Numéro Mobile Money/ })).toHaveValue("");
  });

  it("un double clic sur « Payer » n'initie qu'un paiement", async () => {
    let finish: (value: unknown) => void = () => {};
    const onSubmit = vi.fn(() => new Promise((resolve) => (finish = resolve)));
    render(
      <PaymentForm
        amount={18000}
        countries={COUNTRIES}
        preferred={{ country: "BJ", network: "reseau-a", phone: "+2290190123401" }}
        onSubmit={onSubmit as never}
      />,
    );
    await screen.findByRole("radio", { name: "Réseau A" });
    const form = screen.getByRole("button", { name: /^Payer/ }).closest("form") as HTMLFormElement;
    // Deux envois avant le rendu du bouton occupé
    form.requestSubmit();
    form.requestSubmit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    finish({ ok: true, data: {} });
    await waitFor(() => expect(screen.getByRole("button", { name: /^Payer/ })).toBeEnabled());
  });
});
