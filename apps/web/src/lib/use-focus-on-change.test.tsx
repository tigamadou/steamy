import { render } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it } from "vitest";

import { useFocusOnChange } from "./use-focus-on-change";

function List({ name, page }: { name: string; page: number }) {
  const ref = useFocusOnChange<HTMLUListElement>(name, String(page));
  return (
    <ul ref={ref} tabIndex={-1} aria-label="Liste">
      <li>Page {page}</li>
    </ul>
  );
}

describe("useFocusOnChange", () => {
  it("rien à la première visite ; focus quand la liste est remontée avec une autre clé (key)", () => {
    const { rerender, getByRole } = render(<List key="1" name="a" page={1} />);
    expect(getByRole("list")).not.toHaveFocus();
    rerender(<List key="2" name="a" page={2} />);
    expect(getByRole("list")).toHaveFocus();
  });

  it("même clé au remontage : le focus ne bouge pas, StrictMode compris", () => {
    const { rerender, getByRole } = render(
      <StrictMode>
        <List key="x" name="b" page={1} />
      </StrictMode>,
    );
    expect(getByRole("list")).not.toHaveFocus();
    rerender(
      <StrictMode>
        <List key="y" name="b" page={1} />
      </StrictMode>,
    );
    expect(getByRole("list")).not.toHaveFocus();
    rerender(
      <StrictMode>
        <List key="z" name="b" page={3} />
      </StrictMode>,
    );
    expect(getByRole("list")).toHaveFocus();
  });
});
