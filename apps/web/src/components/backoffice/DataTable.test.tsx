import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { DataTable, type DataColumn } from "./DataTable";
import { StatusBadge } from "./StatusBadge";

type Row = { code: string; label: string; value: number | null };

const columns: DataColumn<Row>[] = [
  { key: "label", label: "Indicateur", width: "60%" },
  { key: "value", label: "Réponse", align: "right" },
  {
    key: "status",
    label: "Statut",
    align: "center",
    render: (row) => <StatusBadge tone="info">{row.code}</StatusBadge>,
  },
];

describe("DataTable", () => {
  it("rend un vrai tableau, titré, avec une ligne par entrée", () => {
    render(
      <DataTable
        columns={columns}
        rows={[
          { code: "nu", label: "Nouveaux utilisateurs", value: 220 },
          { code: "inst", label: "Nouvelles institutions", value: null },
        ]}
        rowKey={(row) => row.code}
        caption="Indicateurs du trimestre"
        dense
      />,
    );
    const table = screen.getByRole("table", { name: "Indicateurs du trimestre" });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual(["Indicateur", "Réponse", "Statut"]);
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(
      within(rows[1])
        .getAllByRole("cell")
        .map((td) => td.textContent),
    ).toEqual(["Nouveaux utilisateurs", "220", "nu"]);
    expect(within(rows[2]).getByText("—")).toBeInTheDocument();
    expect(screen.getByText("Indicateurs du trimestre")).toHaveClass("sr-only");
  });

  it("nomme sa zone défilante par la légende du tableau quand elle déborde", () => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(800);
    render(<DataTable columns={columns} rows={[]} rowKey={(row) => row.code} caption="Indicateurs du trimestre" />);
    const region = screen.getByRole("region", { name: "Indicateurs du trimestre" });
    expect(region).toHaveAttribute("aria-labelledby", screen.getByText("Indicateurs du trimestre").id);
    expect(region).not.toHaveAttribute("aria-label");
    vi.restoreAllMocks();
  });

  it("affiche l'état vide et la légende visible", () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(row) => row.code}
        caption="Paiements"
        showCaption
        empty="Aucun paiement."
      />,
    );
    expect(screen.getByRole("cell", { name: "Aucun paiement." })).toHaveAttribute("colspan", "3");
    expect(screen.getByText("Paiements")).not.toHaveClass("sr-only");
  });

  it("a un message vide par défaut", () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(row) => row.code} caption="Paiements" />);
    expect(screen.getByText("Aucune donnée.")).toBeInTheDocument();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <DataTable
        columns={columns}
        rows={[{ code: "a", label: "A", value: 1 }]}
        rowKey={(row) => row.code}
        caption="KPI"
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
