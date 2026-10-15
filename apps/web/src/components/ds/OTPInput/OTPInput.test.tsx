import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { OTPInput } from "./OTPInput";

const field = () => screen.getByRole("textbox", { name: "Code à 6 chiffres reçu par SMS" });
const cells = () => screen.getAllByTestId("otp-case").map((cell) => cell.textContent);

describe("OTPInput", () => {
  it("adosse les cases à un seul champ natif", () => {
    render(<OTPInput name="code" />);
    const input = field();
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("autocomplete", "one-time-code");
    expect(input).toHaveAttribute("maxlength", "6");
    expect(input).toHaveAttribute("pattern", "\\d*");
    expect(input).toHaveAttribute("name", "code");
    expect(screen.getAllByTestId("otp-case")).toHaveLength(6);
  });

  it("répartit la saisie dans les cases et ignore les lettres", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<OTPInput onChange={onChange} />);
    await user.type(field(), "1a2");
    expect(field()).toHaveValue("12");
    expect(cells()).toEqual(["1", "2", "", "", "", ""]);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith("12");
  });

  it("nettoie un code collé et signale qu'il est complet", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OTPInput onComplete={onComplete} />);
    await user.click(field());
    await user.paste("12 34-56");
    expect(field()).toHaveValue("123456");
    expect(onComplete).toHaveBeenCalledExactlyOnceWith("123456");
    await user.paste("abc");
    expect(field()).toHaveValue("123456");
  });

  it("efface au retour arrière", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<OTPInput defaultValue="1234" onChange={onChange} />);
    await user.type(field(), "{Backspace}");
    expect(field()).toHaveValue("123");
    expect(onChange).toHaveBeenLastCalledWith("123");
  });

  it("met en évidence la case courante quand le champ a le focus", async () => {
    const user = userEvent.setup();
    render(<OTPInput defaultValue="12" length={3} label="Code" />);
    const boxes = screen.getAllByTestId("otp-case");
    expect(boxes.some((box) => box.dataset.active)).toBe(false);
    await user.click(screen.getByRole("textbox", { name: "Code" }));
    expect(boxes[2]).toHaveAttribute("data-active", "true");
    await user.keyboard("3");
    expect(boxes[2]).toHaveAttribute("data-active", "true");
    await user.tab();
    expect(boxes[2]).not.toHaveAttribute("data-active");
  });

  it("fonctionne en contrôlé", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [code, setCode] = useState("9");
      return <OTPInput value={code} onChange={setCode} />;
    }
    render(<Controlled />);
    await user.type(field(), "8");
    expect(cells().slice(0, 2)).toEqual(["9", "8"]);
  });

  it("ignore une frappe qui ne change pas le code", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<OTPInput onChange={onChange} />);
    await user.type(field(), "x");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("se désactive", () => {
    render(<OTPInput disabled defaultValue="12" />);
    expect(field()).toBeDisabled();
  });

  it("annonce l'erreur et marque les cases", async () => {
    const user = userEvent.setup();
    render(<OTPInput error="Code incorrect" autoFocus />);
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(field()).toHaveAccessibleDescription("Code incorrect");
    expect(screen.getByText("Code incorrect").parentElement).toHaveAttribute("aria-live", "assertive");
    expect(screen.getAllByTestId("otp-case")[0]).toHaveClass("border-error-500");
    await user.click(field());
    expect(screen.getAllByTestId("otp-case")[0]).toHaveClass("shadow-[0_0_0_4px_var(--error-100)]");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<OTPInput defaultValue="123" error="Code expiré" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
