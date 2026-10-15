import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { Field } from "../Field";
import { PhoneInput } from "./PhoneInput";
import { flagEmoji, formatNational, toE164, type PhoneCountry } from "./phone";

// Données de test au format de `referentials/countries/` (jamais codées en dur dans le composant)
const COUNTRIES: PhoneCountry[] = [
  { code: "BJ", name: "Bénin", dialCode: "+229", format: "XX XX XX XX XX", pattern: "01\\d{8}" },
  { code: "TG", name: "Togo", dialCode: "228", format: "XX XX XX XX", pattern: "[279]\\d{7}" },
];

describe("utilitaires de téléphone", () => {
  it("dérive le drapeau du code ISO", () => {
    expect(flagEmoji("bj")).toBe("🇧🇯");
  });

  it("met en forme selon le gabarit du pays", () => {
    expect(formatNational("0190123", "XX XX XX XX XX")).toBe("01 90 12 3");
    expect(formatNational("0190123456", undefined)).toBe("0190123456");
  });

  it("produit l'E.164 seulement pour un numéro valide", () => {
    expect(toE164("0190123456", COUNTRIES[0])).toBe("+2290190123456");
    expect(toE164("90123456", COUNTRIES[0])).toBeNull();
    expect(toE164("90123456", COUNTRIES[1])).toBe("+22890123456");
  });
});

describe("PhoneInput", () => {
  it("émet un numéro E.164 au fil de la saisie", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Field label="Numéro de téléphone">
        <PhoneInput countries={COUNTRIES} onChange={onChange} name="phone" />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Numéro de téléphone" });
    await user.type(input, "0190123456");
    expect(input).toHaveValue("01 90 12 34 56");
    expect(onChange).toHaveBeenLastCalledWith({
      country: "BJ",
      national: "0190123456",
      e164: "+2290190123456",
      valid: true,
    });
    expect(document.querySelector<HTMLInputElement>('input[name="phone"]')?.value).toBe("+2290190123456");
  });

  it("revalide le numéro au changement de pays", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PhoneInput countries={COUNTRIES} defaultValue="90123456" onChange={onChange} />);
    const country = screen.getByRole("combobox", { name: "Pays" });
    expect(country).toHaveValue("BJ");
    await user.selectOptions(country, "TG");
    expect(onChange).toHaveBeenLastCalledWith({
      country: "TG",
      national: "90123456",
      e164: "+22890123456",
      valid: true,
    });
    expect(screen.getByRole("textbox")).toHaveValue("90 12 34 56");
    expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "00 00 00 00");
  });

  it("signale un numéro invalide sans E.164", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Field label="Téléphone" error="Numéro invalide">
        <PhoneInput countries={COUNTRIES} onChange={onChange} name="phone" />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Téléphone" });
    await user.type(input, "12ab34");
    expect(onChange).toHaveBeenLastCalledWith({ country: "BJ", national: "1234", e164: null, valid: false });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(document.querySelector<HTMLInputElement>('input[name="phone"]')?.value).toBe("");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <Field label="Téléphone du parent" required>
        <PhoneInput countries={COUNTRIES} defaultCountry="TG" />
      </Field>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
