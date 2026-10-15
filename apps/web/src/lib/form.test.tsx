import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { submitWith } from "./form";

describe("submitWith", () => {
  it("transmet les données du formulaire sans le réinitialiser", () => {
    const dispatch = vi.fn();
    render(
      <form onSubmit={submitWith(dispatch)}>
        <label>
          Prénom
          <input name="firstName" defaultValue="" />
        </label>
        <button type="submit">Envoyer</button>
      </form>,
    );
    const input = screen.getByRole("textbox", { name: "Prénom" });
    fireEvent.change(input, { target: { value: "Awa" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    const data = dispatch.mock.calls[0][0] as FormData;
    expect(data.get("firstName")).toBe("Awa");
    expect(input).toHaveValue("Awa");
  });
});
