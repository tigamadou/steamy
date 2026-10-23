import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { Field } from "../Field";
import { PhoneInput } from "./PhoneInput";
import { flagEmoji, formatNational, isValidNational, maskPhone, toE164, type PhoneCountry } from "./phone";

// Données de test au format de `referentials/countries/` (jamais codées en dur dans le composant)
const COUNTRIES: PhoneCountry[] = [
  { code: "TG", label: "Togo", dialCode: "228", phoneFormat: "XX XX XX XX", phoneRegex: "^[279][0-9]{7}$" },
  { code: "BJ", label: "Bénin", flag: "🇧🇯", dialCode: "229", phoneFormat: "XX XX XX XX XX", phoneRegex: "^01[0-9]{8}$" },
];
const [TOGO, BENIN] = COUNTRIES;

describe("utilitaires de téléphone", () => {
  it("dérive le drapeau du code ISO", () => {
    expect(flagEmoji("bj")).toBe("🇧🇯");
  });

  it("met en forme selon le gabarit du pays", () => {
    expect(formatNational("0190123", "XX XX XX XX XX")).toBe("01 90 12 3");
    expect(formatNational("0190123456", undefined)).toBe("0190123456");
  });

  it("produit l'E.164 seulement pour un numéro valide", () => {
    expect(toE164("0190123456", BENIN)).toBe("+2290190123456");
    expect(toE164("90123456", BENIN)).toBeNull();
    expect(toE164("90123456", TOGO)).toBe("+22890123456");
  });

  it("valide par la longueur du gabarit, ou au minimum 4 chiffres, sans expression régulière", () => {
    const byFormat: PhoneCountry = { code: "NE", label: "Niger", dialCode: "227", phoneFormat: "XX XX XX XX" };
    expect(isValidNational("90123456", byFormat)).toBe(true);
    expect(isValidNational("9012345", byFormat)).toBe(false);
    const bare: PhoneCountry = { code: "ML", label: "Mali", dialCode: "223" };
    expect(isValidNational("1234", bare)).toBe(true);
    expect(isValidNational("123", bare)).toBe(false);
    expect(isValidNational("", bare)).toBe(false);
    expect(isValidNational("1", { ...bare, phoneFormat: "-" })).toBe(false);
  });

  it("masque un numéro en gardant l'indicatif et les deux premiers et derniers chiffres", () => {
    expect(maskPhone("+2290190123456", COUNTRIES)).toBe("+229 01 •• •• •• 56");
    expect(maskPhone("+22890123456", COUNTRIES)).toBe("+228 90 •• •• 56");
    expect(maskPhone("+33612345678")).toBe("+33•••••••78");
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

  it("présélectionne le Bénin et affiche le drapeau servi par l'API", () => {
    render(<PhoneInput countries={COUNTRIES} />);
    expect(screen.getByRole("combobox", { name: "Pays" })).toHaveValue("BJ");
    expect(screen.getByText("🇧🇯")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAttribute("autocomplete", "tel-national");
  });

  it("présélectionne le Bénin quand la liste des pays arrive après le premier rendu", () => {
    const { rerender } = render(<PhoneInput countries={[]} />);
    rerender(<PhoneInput countries={COUNTRIES} />);
    expect(screen.getByRole("combobox", { name: "Pays" })).toHaveValue("BJ");
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

  it("attend la liste des pays avant d'accepter une saisie, puis devient utilisable", () => {
    const { rerender } = render(<PhoneInput countries={[]} name="phone" />);
    expect(screen.getByRole("textbox")).toBeDisabled();
    rerender(<PhoneInput countries={COUNTRIES} name="phone" />);
    expect(screen.getByRole("textbox")).toBeEnabled();
  });

  it("retombe sur le premier pays quand le pays initial est inconnu", () => {
    render(<PhoneInput countries={COUNTRIES} defaultCountry="ZZ" />);
    expect(screen.getByRole("combobox", { name: "Pays" })).toHaveValue("TG");
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
