import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { NumberStepper } from "./NumberStepper";

const spin = () => screen.getByRole("spinbutton", { name: "Ton âge" });

describe("NumberStepper", () => {
  it("expose la valeur, les bornes et l'unité", () => {
    const { container } = render(<NumberStepper min={10} max={17} defaultValue={13} label="Ton âge" unit="ans" name="age" />);
    expect(spin()).toHaveAttribute("aria-valuemin", "10");
    expect(spin()).toHaveAttribute("aria-valuemax", "17");
    expect(spin()).toHaveAttribute("aria-valuenow", "13");
    expect(spin()).toHaveAttribute("aria-valuetext", "13 ans");
    expect(container.querySelector("input[type=hidden]")).toHaveValue("13");
  });

  it("part de min sans valeur initiale, sans unité ni champ caché", () => {
    const { container } = render(<NumberStepper min={10} max={17} label="Ton âge" />);
    expect(spin()).toHaveAttribute("aria-valuenow", "10");
    expect(spin()).not.toHaveAttribute("aria-valuetext");
    expect(container.querySelector("input")).toBeNull();
    expect(screen.getByRole("button", { name: "Diminuer" })).toBeDisabled();
  });

  it("se pilote à la souris et se bloque aux bornes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NumberStepper min={10} max={11} defaultValue={10} label="Ton âge" onChange={onChange} />);
    const plus = screen.getByRole("button", { name: "Augmenter" });
    await user.click(plus);
    expect(onChange).toHaveBeenLastCalledWith(11);
    expect(plus).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Diminuer" }));
    expect(spin()).toHaveAttribute("aria-valuenow", "10");
  });

  it("se pilote au clavier", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NumberStepper min={10} max={17} defaultValue={13} label="Ton âge" onChange={onChange} pageStep={2} />);
    await user.tab();
    expect(spin()).toHaveFocus();
    const now = () => spin().getAttribute("aria-valuenow");
    await user.keyboard("{ArrowUp}");
    expect(now()).toBe("14");
    await user.keyboard("{ArrowRight}");
    expect(now()).toBe("15");
    await user.keyboard("{ArrowDown}{ArrowLeft}");
    expect(now()).toBe("13");
    await user.keyboard("{PageUp}");
    expect(now()).toBe("15");
    await user.keyboard("{PageDown}");
    expect(now()).toBe("13");
    await user.keyboard("{End}");
    expect(now()).toBe("17");
    await user.keyboard("{ArrowUp}");
    expect(now()).toBe("17");
    await user.keyboard("{Home}");
    expect(now()).toBe("10");
    await user.keyboard("a");
    expect(onChange).toHaveBeenCalledTimes(8);
  });

  it("fonctionne en contrôlé et borne la valeur reçue", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [age, setAge] = useState(20);
      return <NumberStepper min={10} max={17} value={age} onChange={setAge} label="Ton âge" />;
    }
    render(<Controlled />);
    expect(spin()).toHaveAttribute("aria-valuenow", "17");
    await user.click(screen.getByRole("button", { name: "Diminuer" }));
    expect(spin()).toHaveAttribute("aria-valuenow", "16");
  });

  it("se désactive", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NumberStepper min={10} max={17} defaultValue={13} label="Ton âge" disabled onChange={onChange} />);
    expect(spin()).toHaveAttribute("aria-disabled", "true");
    expect(spin()).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("button", { name: "Augmenter" })).toBeDisabled();
    spin().focus();
    await user.keyboard("{ArrowUp}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<NumberStepper min={10} max={17} defaultValue={13} label="Ton âge" unit="ans" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
