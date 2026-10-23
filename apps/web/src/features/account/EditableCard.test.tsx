import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { EditableCard } from "./EditableCard";

function Harness() {
  const [editing, setEditing] = useState(false);
  return (
    <EditableCard title="Mes informations" rows={[{ label: "Nom", value: "Koffi" }]} editing={editing} onEdit={() => setEditing(true)}>
      <button onClick={() => setEditing(false)}>Annuler</button>
    </EditableCard>
  );
}

describe("EditableCard", () => {
  it("à l'ouverture, le focus passe au titre du formulaire ; à la fermeture, il revient au bouton « Modifier »", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    // Rien n'est focalisé au premier affichage
    expect(document.body).toHaveFocus();
    await user.click(screen.getByRole("button", { name: /Modifier/ }));
    expect(screen.getByRole("heading", { level: 3, name: "Mes informations" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByRole("button", { name: /Modifier/ })).toHaveFocus();
  });
});
