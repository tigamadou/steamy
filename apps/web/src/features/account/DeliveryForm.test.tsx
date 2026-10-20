import type { Schemas } from "@steamy/api-client";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetReferentials } from "@/lib/use-referential";
import { axe } from "@/test/axe";

const GET = vi.fn();
const PUT = vi.fn();
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ GET, PUT }) }));

const { DeliveryForm } = await import("./DeliveryForm");

const ZONES: Record<string, Schemas["DeliveryZone"][]> = {
  BJ: [
    { id: 1, country: "BJ", name: "Cotonou et Abomey-Calavi", fee: 1000, delayLabel: "24 à 48 h" },
    { id: 2, country: "BJ", name: "Porto-Novo", fee: 1500, delayLabel: "2 à 3 jours" },
  ],
  TG: [{ id: 5, country: "TG", name: "Lomé", fee: 2000, delayLabel: "3 jours" }],
};

const ADDRESS: Schemas["DeliveryAddress"] = {
  zoneId: 2,
  zone: ZONES.BJ[1],
  recipientName: "Léa Adjovi",
  city: "Porto-Novo",
  district: "Ouando",
  addressLine: "Près du marché",
};

const respond = (status: number, body: object = {}) => ({ ...body, response: new Response(null, { status }) });
const failure = (status: number, code: string, fields?: Record<string, string>) =>
  respond(status, {
    error: {
      code,
      message: "",
      fields: fields && Object.fromEntries(Object.entries(fields).map(([name, text]) => [name, [{ message: text }]])),
    },
  });

const zone = () => screen.getByRole("combobox", { name: /^Ville ou zone/ });
const save = () => userEvent.click(screen.getByRole("button", { name: "Enregistrer l'adresse" }));

function renderForm(address: Schemas["DeliveryAddress"] | null = ADDRESS, defaultCountry = "BJ") {
  return render(<DeliveryForm address={address} defaultCountry={defaultCountry} recipientName="Léa Adjovi" />);
}

describe("DeliveryForm (WD19)", () => {
  beforeEach(() => {
    resetReferentials();
    PUT.mockReset();
    GET.mockReset().mockImplementation(async (path: string, init?: { params?: { query?: { country?: string } } }) => {
      if (path === "/api/referentials/countries/") {
        return respond(200, { data: [{ id: 1, code: "BJ", label: "Bénin", dialCode: "229" }, { id: 2, code: "TG", label: "Togo", dialCode: "228" }] });
      }
      return respond(200, { data: ZONES[init?.params?.query?.country ?? ""] ?? [] });
    });
  });

  it("préremplie avec l'adresse enregistrée ; enregistre zone, ville, quartier, rue ; destinataire conservé", async () => {
    PUT.mockResolvedValue(respond(200, { data: ADDRESS }));
    const { container } = renderForm();
    await waitFor(() => expect(zone()).toHaveValue("2"));
    expect(screen.getByRole("combobox", { name: /^Pays/ })).toHaveValue("BJ");
    expect(screen.getByRole("option", { name: "Porto-Novo (2 à 3 jours)" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^Ville\b/ })).toHaveValue("Porto-Novo");
    expect(screen.queryByText(/Téléphone|Mobile Money/)).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();

    await userEvent.selectOptions(zone(), "1");
    await save();
    expect(PUT).toHaveBeenCalledWith("/api/accounts/me/delivery-address/", {
      body: { zoneId: 1, recipientName: "Léa Adjovi", city: "Porto-Novo", district: "Ouando", addressLine: "Près du marché" },
    });
    expect(await screen.findByText("Ton adresse de livraison est enregistrée.")).toBeInTheDocument();
  });

  it("sans adresse : pays du profil, champs vides, tous obligatoires ; destinataire = l'apprenant", async () => {
    PUT.mockResolvedValue(respond(200, { data: ADDRESS }));
    renderForm(null);
    await waitFor(() => expect(screen.getByRole("option", { name: /Cotonou/ })).toBeInTheDocument());
    await save();
    expect(PUT).not.toHaveBeenCalled();
    expect(await screen.findByRole("link", { name: "Choisis ta zone de livraison." })).toHaveAttribute("href", "#livraison-zone");
    for (const message of ["Indique ta ville.", "Indique ton quartier.", "Indique ta rue ou un repère."]) {
      expect(screen.getByRole("link", { name: message })).toBeInTheDocument();
    }

    await userEvent.selectOptions(zone(), "1");
    await userEvent.type(screen.getByRole("textbox", { name: /^Ville\b/ }), " Cotonou ");
    await userEvent.type(screen.getByRole("textbox", { name: /^Quartier/ }), "Fidjrossè");
    await userEvent.type(screen.getByRole("textbox", { name: /^Rue/ }), "Rue 12");
    await save();
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/api/accounts/me/delivery-address/", {
        body: { zoneId: 1, recipientName: "Léa Adjovi", city: "Cotonou", district: "Fidjrossè", addressLine: "Rue 12" },
      }),
    );
  });

  it("changer de pays recharge ses zones", async () => {
    renderForm();
    await waitFor(() => expect(zone()).toHaveValue("2"));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /^Pays/ }), "TG");
    await waitFor(() => expect(screen.getByRole("option", { name: "Lomé (3 jours)" })).toBeInTheDocument());
    expect(zone()).toHaveValue("");
  });

  it("sans pays connu : à choisir", async () => {
    renderForm(null, "");
    await waitFor(() => expect(screen.getByRole("option", { name: "Bénin" })).toBeInTheDocument());
    await save();
    expect(await screen.findByRole("link", { name: "Choisis ton pays." })).toHaveAttribute("href", "#livraison-pays");
  });

  it("erreurs de champ de l'API sous leurs champs ; autre erreur : message générique", async () => {
    PUT.mockResolvedValueOnce(failure(400, "VALIDATION_ERROR", { zoneId: "Zone inactive.", addressLine: "Trop long.", phone: "x" }));
    PUT.mockResolvedValueOnce(failure(500, "SERVER_ERROR"));
    renderForm();
    await waitFor(() => expect(zone()).toHaveValue("2"));
    await save();
    expect(await screen.findByRole("link", { name: "Zone inactive." })).toHaveAttribute("href", "#livraison-zone");
    expect(screen.getByRole("link", { name: "Trop long." })).toHaveAttribute("href", "#livraison-rue");
    await save();
    expect(await screen.findByText(/Une erreur est survenue de notre côté/)).toBeInTheDocument();
  });

  it("pays illisibles : « Réessayer »", async () => {
    GET.mockImplementation(async () => respond(500, {}));
    renderForm(null, "");
    expect(await screen.findAllByText("Impossible de charger la liste.")).not.toHaveLength(0);
    await userEvent.click(screen.getAllByRole("button", { name: "Réessayer" })[0]);
    expect(GET).toHaveBeenCalledTimes(2);
  });
});
