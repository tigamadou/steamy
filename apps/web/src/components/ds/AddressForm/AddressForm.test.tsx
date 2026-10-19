import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { AddressForm, type AddressFormProps } from "./AddressForm";

const COUNTRIES = [
  { code: "BJ", label: "Bénin" },
  { code: "TG", label: "Togo" },
];
const ZONES = {
  BJ: [
    { id: 1, code: "cotonou", label: "Cotonou" },
    { id: 2, code: "porto-novo", label: "Porto-Novo" },
  ],
  TG: [{ id: 3, code: "lome", label: "Lomé" }],
} as Record<string, AddressFormProps["zones"]["items"]>;

function Harness(props: Partial<AddressFormProps>) {
  const [country, setCountry] = useState("BJ");
  return (
    <form aria-label="Adresse">
      <AddressForm
        legend="Adresse de livraison"
        countries={{ items: COUNTRIES, status: "ready" }}
        zones={{ items: ZONES[country], status: "ready" }}
        country={country}
        onCountryChange={setCountry}
        {...props}
      />
    </form>
  );
}

function formValues() {
  return Object.fromEntries(new FormData(screen.getByRole("form", { name: "Adresse" }) as HTMLFormElement));
}

describe("AddressForm", () => {
  it("pays, zone, quartier, rue : valeurs initiales et champs nommés", async () => {
    const { container } = render(
      <Harness defaultValues={{ zone: "porto-novo", district: "Ouando", street: "Près du marché" }} />,
    );
    expect(screen.getByRole("group", { name: "Adresse de livraison" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /^Pays/ })).toHaveValue("BJ");
    expect(screen.getByRole("combobox", { name: /^Ville ou zone/ })).toHaveValue("porto-novo");
    expect(screen.getByRole("textbox", { name: /^Rue \/ repère/ })).toHaveAccessibleDescription(/aide le livreur à te trouver/);
    expect(formValues()).toEqual({ country: "BJ", zone: "porto-novo", district: "Ouando", street: "Près du marché" });
    expect(await axe(container)).toHaveNoViolations();
  });

  it("changer de pays vide la zone et recharge la liste de l'appelant", async () => {
    const user = userEvent.setup();
    const onCountryChange = vi.fn();
    function Spy() {
      const [country, setCountry] = useState("BJ");
      return (
        <form aria-label="Adresse">
          <AddressForm
            legend="Adresse"
            countries={{ items: COUNTRIES, status: "ready" }}
            zones={{ items: ZONES[country], status: "ready" }}
            country={country}
            onCountryChange={(next) => {
              onCountryChange(next);
              setCountry(next);
            }}
            defaultValues={{ zone: "cotonou" }}
          />
        </form>
      );
    }
    render(<Spy />);
    await user.selectOptions(screen.getByRole("combobox", { name: /^Pays/ }), "TG");
    expect(onCountryChange).toHaveBeenCalledWith("TG");
    const zone = screen.getByRole("combobox", { name: /^Ville ou zone/ });
    expect(zone).toHaveValue("");
    await user.selectOptions(zone, "lome");
    expect(formValues()).toMatchObject({ country: "TG", zone: "lome" });
  });

  it("erreurs par champ, noms et identifiants personnalisés, zone par id, vouvoiement", () => {
    render(
      <Harness
        legendHidden
        register="vous"
        idPrefix="livraison"
        zoneValueKey="id"
        names={{ country: "pays", zone: "zoneId", district: "quartier", street: "rue" }}
        errors={{ country: "Pays requis", zone: "Zone requise", district: "Quartier requis", street: "Rue requise" }}
      />,
    );
    expect(screen.getByText("Adresse de livraison")).toHaveClass("sr-only");
    expect(screen.getByRole("combobox", { name: /^Pays/ })).toHaveAttribute("id", "livraison-pays");
    expect(screen.getByRole("combobox", { name: /^Pays/ })).toHaveAccessibleDescription("Pays requis");
    expect(screen.getByRole("combobox", { name: /^Ville ou zone/ })).toHaveAccessibleDescription("Zone requise");
    expect(screen.getByRole("textbox", { name: /^Quartier/ })).toHaveAttribute("id", "livraison-quartier");
    expect(screen.getByRole("textbox", { name: /^Rue/ })).toHaveAccessibleDescription("Rue requise");
    expect(screen.getByRole("option", { name: "Cotonou" })).toHaveAttribute("value", "1");
    expect(screen.getByRole("option", { name: "Choisissez votre pays" })).toBeInTheDocument();
    expect(Object.keys(formValues())).toEqual(["pays", "zoneId", "quartier", "rue"]);
  });

  it("vouvoiement de l'aide, listes en chargement ou en erreur, désactivé", () => {
    const onRetry = vi.fn();
    render(
      <Harness
        register="vous"
        disabled
        countries={{ items: undefined, status: "loading" }}
        zones={{ items: undefined, status: "error", onRetry }}
      />,
    );
    expect(screen.getByRole("textbox", { name: /^Rue/ })).toHaveAccessibleDescription(/à vous trouver/);
    expect(screen.getByRole("group")).toBeDisabled();
    expect(screen.getByText("Impossible de charger la liste.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeDisabled();
    expect(onRetry).not.toHaveBeenCalled();
  });
});
