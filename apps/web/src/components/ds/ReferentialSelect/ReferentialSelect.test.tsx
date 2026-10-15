import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { Field } from "../Field";
import { ReferentialSelect } from "./ReferentialSelect";

const CLASSES = [
  { id: 7, code: "6e", label: "6ème" },
  { id: 8, code: "5e", label: "5ème" },
  { id: 9, code: "4e", label: "4ème" },
];

describe("ReferentialSelect", () => {
  it("est désactivé avec « Chargement… » pendant le chargement", () => {
    render(
      <Field label="Classe">
        <ReferentialSelect items={undefined} status="loading" />
      </Field>,
    );
    const select = screen.getByRole("combobox", { name: "Classe" });
    expect(select).toBeDisabled();
    expect(select).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("option", { name: "Chargement…" })).toBeInTheDocument();
  });

  it("liste les entrées dans l'ordre reçu après l'option vide, valeur = code", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Field label="Classe" required>
        <ReferentialSelect items={CLASSES} status="ready" name="classe" onChange={onChange} />
      </Field>,
    );
    const select = screen.getByRole("combobox", { name: /Classe/ });
    expect(select).toBeEnabled();
    expect(select).toBeRequired();
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Choisis…",
      "6ème",
      "5ème",
      "4ème",
    ]);
    await user.selectOptions(select, "5ème");
    expect(onChange).toHaveBeenCalledWith("5e");
  });

  it("peut utiliser l'id comme valeur, un autre texte d'option vide et une valeur contrôlée", () => {
    render(
      <ReferentialSelect
        aria-label="Classe"
        items={CLASSES}
        status="ready"
        valueKey="id"
        placeholder="Aucune"
        value="9"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("option", { name: "Aucune" })).toHaveValue("");
    expect(screen.getByRole("combobox")).toHaveValue("9");
  });

  it("reste vide s'il est prêt sans entrées, désactivable", () => {
    render(<ReferentialSelect aria-label="Classe" items={undefined} status="ready" disabled />);
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("affiche l'erreur et relance le chargement", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(
      <ReferentialSelect aria-label="Classe" aria-describedby="aide" items={undefined} status="error" onRetry={onRetry} />,
    );
    const select = screen.getByRole("combobox");
    expect(select).toBeDisabled();
    expect(select.getAttribute("aria-describedby")).toMatch(/^aide referentiel-.+-erreur$/);
    expect(screen.getByText("Impossible de charger la liste.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("n'affiche pas « Réessayer » sans onRetry", () => {
    render(<ReferentialSelect aria-label="Classe" items={undefined} status="error" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveAccessibleDescription("Impossible de charger la liste.");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <div>
        <Field label="Classe">
          <ReferentialSelect items={CLASSES} status="ready" />
        </Field>
        <Field label="Handicap">
          <ReferentialSelect items={undefined} status="error" onRetry={() => {}} />
        </Field>
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
