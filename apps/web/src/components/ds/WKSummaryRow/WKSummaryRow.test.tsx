import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WKSummaryRow } from "./WKSummaryRow";

describe("WKSummaryRow", () => {
  it("terme et valeur d'une liste de définitions, total mis en avant", () => {
    render(
      <dl>
        <WKSummaryRow label="Sous-total" value="70 000 F CFA" />
        <WKSummaryRow label="Total" value="71 000 F CFA" strong />
      </dl>,
    );
    expect(screen.getByText("Sous-total").tagName).toBe("DT");
    expect(screen.getByText("70 000 F CFA").tagName).toBe("DD");
    expect(screen.getByText("71 000 F CFA")).toHaveClass("text-primary-700");
    expect(screen.getByText("70 000 F CFA")).not.toHaveClass("text-primary-700");
  });
});
