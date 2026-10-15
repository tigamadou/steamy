import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { Input } from "../Input";
import { Select } from "../Select";
import { Textarea } from "../Textarea";
import { Field } from "./Field";

describe("Field", () => {
  it("relie le libellé et l'aide au contrôle", () => {
    render(
      <Field label="Prénom" hint="Tel qu'il apparaîtra sur ton certificat">
        <Input />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Prénom" });
    expect(input).toHaveAccessibleDescription("Tel qu'il apparaîtra sur ton certificat");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("remplace l'aide par l'erreur et marque le champ invalide", () => {
    render(
      <Field label="E-mail" hint="On ne le partage jamais" error="Adresse e-mail invalide">
        <Input type="email" />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "E-mail" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Adresse e-mail invalide");
    expect(screen.queryByText("On ne le partage jamais")).not.toBeInTheDocument();
  });

  it("signale un champ obligatoire", () => {
    render(
      <Field label="Ville" required>
        <Input />
      </Field>,
    );
    expect(screen.getByRole("textbox", { name: /Ville/ })).toBeRequired();
    expect(screen.getByText("(obligatoire)")).toHaveClass("sr-only");
  });

  it("habille aussi Textarea et Select, au clavier", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Field label="Message" error="Le message est vide">
          <Textarea />
        </Field>
        <Field label="Sujet">
          <Select defaultValue="question">
            <option value="question">Question</option>
            <option value="paiement">Paiement</option>
          </Select>
        </Field>
      </>,
    );
    const textarea = screen.getByRole("textbox", { name: "Message" });
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    await user.click(textarea);
    await user.keyboard("Bonjour");
    expect(textarea).toHaveValue("Bonjour");
    await user.tab();
    const select = screen.getByRole("combobox", { name: "Sujet" });
    expect(select).toHaveFocus();
    await user.selectOptions(select, "paiement");
    expect(select).toHaveValue("paiement");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <form>
        <Field label="Nom" required hint="Ton nom de famille">
          <Input icon="user" />
        </Field>
        <Field label="Montant" error="Montant requis">
          <Input prefix="F CFA" inputMode="numeric" />
        </Field>
        <Field label="Message">
          <Textarea />
        </Field>
        <Field label="Sujet">
          <Select>
            <option>Question</option>
          </Select>
        </Field>
      </form>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
