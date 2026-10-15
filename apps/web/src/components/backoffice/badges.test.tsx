import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { KpiStatusBadge } from "./KpiStatusBadge";
import { SOURCE_KINDS, SourceTag } from "./SourceTag";
import { StatusBadge, type StatusTone } from "./StatusBadge";

const TONES: StatusTone[] = ["neutral", "success", "amber", "error", "info"];

describe("SourceTag", () => {
  it.each([
    ["auto", "Auto", "Calculé automatiquement depuis la plateforme"],
    ["manual", "Manuel", "Saisi par le personnel avant soumission"],
    ["unavailable", "Indisponible", "Donnée non collectée"],
  ] as const)("étiquette la source %s", (source, label, description) => {
    render(<SourceTag source={source} />);
    const tag = screen.getByTitle(description);
    expect(tag).toHaveTextContent(`${label} · ${description}`);
  });

  it("couvre les trois sources de la légende", () => {
    expect(SOURCE_KINDS).toEqual(["auto", "manual", "unavailable"]);
  });
});

describe("StatusBadge et KpiStatusBadge", () => {
  it.each(TONES)("rend le ton %s", (tone) => {
    render(<StatusBadge tone={tone}>Soumis</StatusBadge>);
    expect(screen.getByText("Soumis")).toBeInTheDocument();
  });

  it("affiche le statut du serveur tel quel (D73)", () => {
    render(<KpiStatusBadge status={{ status: "below", tone: "amber", label: "En dessous" }} />);
    expect(screen.getByText("En dessous")).toHaveClass("bg-amber-100");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <p>
        <SourceTag source="auto" />
        <KpiStatusBadge status={{ status: "reached", tone: "success", label: "Atteinte" }} />
      </p>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
