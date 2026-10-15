import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { Field } from "../Field";
import type { PhoneCountry } from "../PhoneInput";
import { IdentifierInput } from "./IdentifierInput";

// Format de `referentials/countries/` (jamais codé en dur dans le composant)
const COUNTRIES: PhoneCountry[] = [
  { code: "TG", label: "Togo", dialCode: "228", phoneFormat: "XX XX XX XX" },
  { code: "BJ", label: "Bénin", flag: "🇧🇯", dialCode: "229", phoneFormat: "XX XX XX XX XX" },
];

function setup(props: Partial<Parameters<typeof IdentifierInput>[0]> = {}) {
  const onChange = vi.fn();
  render(
    <Field label="Identifiant ou numéro" required>
      <IdentifierInput countries={COUNTRIES} onChange={onChange} name="identifier" {...props} />
    </Field>,
  );
  const input = screen.getByRole("textbox", { name: /Identifiant ou numéro/ });
  const hidden = () => document.querySelector<HTMLInputElement>('input[name="identifier"]')?.value;
  return { onChange, input, hidden, user: userEvent.setup() };
}

describe("IdentifierInput", () => {
  it("garde un identifiant d'apprenant tel quel", async () => {
    const { input, onChange, hidden, user } = setup();
    expect(input).toHaveAttribute("autocomplete", "username");
    await user.type(input, "lea.adjovi");
    expect(onChange).toHaveBeenLastCalledWith({ raw: "lea.adjovi", kind: "username", value: "lea.adjovi" });
    expect(hidden()).toBe("lea.adjovi");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("reconnaît un email", async () => {
    const { input, onChange, user } = setup();
    await user.type(input, "koffi@steamy.test");
    expect(onChange).toHaveBeenLastCalledWith({ raw: "koffi@steamy.test", kind: "email", value: "koffi@steamy.test" });
  });

  it("propose le pays pour un numéro national, le Bénin d'abord, et normalise en E.164", async () => {
    const { input, onChange, hidden, user } = setup();
    await user.type(input, "0190000001");
    const country = screen.getByRole("combobox", { name: "Pays du numéro" });
    expect(country).toHaveValue("BJ");
    expect(input).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith({ raw: "0190000001", kind: "phone", value: "+2290190000001" });
    expect(hidden()).toBe("+2290190000001");

    await user.selectOptions(country, "TG");
    expect(onChange).toHaveBeenLastCalledWith({ raw: "0190000001", kind: "phone", value: "+2280190000001" });
  });

  it("n'affiche pas le pays quand l'indicatif est saisi", async () => {
    const { input, onChange, user } = setup();
    await user.type(input, "+228 90 12 34 56");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith({ raw: "+228 90 12 34 56", kind: "phone", value: "+22890123456" });
  });

  it("reste utilisable sans liste de pays ni nom de champ", async () => {
    const onChange = vi.fn();
    render(<IdentifierInput countries={[]} onChange={onChange} defaultCountry="ZZ" />);
    await userEvent.type(screen.getByRole("textbox"), "90");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith({ raw: "90", kind: "phone", value: "90" });
  });

  it("prend le premier pays quand le pays par défaut est absent, sans rappel", async () => {
    render(<IdentifierInput countries={COUNTRIES} defaultCountry="ZZ" defaultValue="90123456" />);
    expect(screen.getByRole("combobox")).toHaveValue("TG");
    await userEvent.selectOptions(screen.getByRole("combobox"), "BJ");
    expect(screen.getByRole("combobox")).toHaveValue("BJ");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <Field label="Identifiant ou numéro" error="Identifiant ou mot de passe incorrect">
        <IdentifierInput countries={COUNTRIES} defaultValue="0190000001" />
      </Field>,
    );
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    expect(await axe(container)).toHaveNoViolations();
  });
});
