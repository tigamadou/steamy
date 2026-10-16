import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { Field } from "../Field";
import { formatKitCode, KitCodeInput } from "./KitCodeInput";

describe("formatKitCode", () => {
  it.each([
    ["", ""],
    ["-- ", ""],
    ["s", "S"],
    ["stea", "STEA"],
    ["steamy", "STEAMY"],
    ["steamy-", "STEAMY"],
    ["steamyab", "STEAMY-AB"],
    ["ab12cd34", "STEAMY-AB12-CD34"],
    ["steamy ab12 cd34", "STEAMY-AB12-CD34"],
    ["STEAMY-AB12-CD34", "STEAMY-AB12-CD34"],
    ["s1", "STEAMY-S1"],
    ["ab12", "STEAMY-AB12"],
    // Aucune troncature ni validation : le serveur juge (KIT_CODE_INVALID)
    ["ab12cd34ef", "STEAMY-AB12-CD34EF"],
    ["ab12-cd3o", "STEAMY-AB12-CD3O"],
  ])("« %s » → « %s »", (raw, expected) => {
    expect(formatKitCode(raw)).toBe(expected);
  });
});

function Controlled() {
  const [code, setCode] = useState("");
  return (
    <Field label="Code Kit" required hint="Imprimé sur la notice du kit">
      <KitCodeInput value={code} onValueChange={setCode} />
    </Field>
  );
}

describe("KitCodeInput", () => {
  it("met en majuscules et insère les tirets à la frappe", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByRole("textbox", { name: /Code Kit/ });
    expect(input).toHaveAttribute("placeholder", "STEAMY-XXXX-XXXX");
    expect(input).toHaveAttribute("autocomplete", "off");
    await user.type(input, "ab12cd34");
    expect(input).toHaveValue("STEAMY-AB12-CD34");
  });

  it("accepte un code collé, en minuscules et sans tirets", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByRole("textbox", { name: /Code Kit/ });
    await user.click(input);
    await user.paste("steamy ab12 cd34");
    expect(input).toHaveValue("STEAMY-AB12-CD34");
    fireEvent.change(input, { target: { value: "" } });
    expect(input).toHaveValue("");
  });

  it("se marque invalide et reste accessible", async () => {
    const { container } = render(
      <Field label="Code Kit" error="Ce code n'existe pas.">
        <KitCodeInput value="STEAMY-AB12" onValueChange={() => {}} />
      </Field>,
    );
    expect(screen.getByRole("textbox", { name: /Code Kit/ })).toHaveAttribute("aria-invalid", "true");
    expect(await axe(container)).toHaveNoViolations();
  });
});
