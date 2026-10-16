import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useFocusOnChange } from "./use-focus-on-change";

function List({ page }: { page: number }) {
  const ref = useFocusOnChange<HTMLUListElement>(page);
  return (
    <ul ref={ref} tabIndex={-1} aria-label="Liste">
      <li>Page {page}</li>
    </ul>
  );
}

describe("useFocusOnChange", () => {
  it("ne prend pas le focus au premier affichage, puis le prend à chaque changement de page", () => {
    const { rerender, getByRole } = render(<List page={1} />);
    expect(getByRole("list")).not.toHaveFocus();
    rerender(<List page={2} />);
    expect(getByRole("list")).toHaveFocus();
  });
});
