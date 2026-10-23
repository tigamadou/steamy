import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TaxRows } from "./TaxRows";

describe("TaxRows", () => {
  it("une ligne par taxe de l'API, montant tel quel", () => {
    render(
      <dl>
        <TaxRows
          taxes={[
            { code: "vat", rate: "18", base: 10000, amount: 1800 },
            { code: "aib", rate: "1.5", base: 10000, amount: 150 },
          ]}
        />
      </dl>,
    );
    expect(screen.getByText("TVA (18 %)")).toBeInTheDocument();
    expect(screen.getByText(/1\s?800\s?F CFA/)).toBeInTheDocument();
    expect(screen.getByText("AIB (1.5 %)")).toBeInTheDocument();
    expect(screen.getByText(/150\s?F CFA/)).toBeInTheDocument();
  });

  it("rien sans taxe", () => {
    const { container } = render(<TaxRows taxes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
