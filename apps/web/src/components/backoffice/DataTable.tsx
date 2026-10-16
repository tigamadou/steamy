import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import { FOCUS } from "./styles";

export type DataColumn<Row> = {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  /** Largeur CSS de la colonne (ex. `"30%"`). */
  width?: string;
  /** Cellule ; par défaut la valeur `row[key]`. */
  render?: (row: Row) => ReactNode;
};

export type DataTableProps<Row> = {
  columns: DataColumn<Row>[];
  rows: Row[];
  /** Titre du tableau (lu par les lecteurs d'écran ; visible si `showCaption`). */
  caption: string;
  showCaption?: boolean;
  rowKey: (row: Row, index: number) => string;
  /** Message de l'état vide. */
  empty?: ReactNode;
  dense?: boolean;
};

const ALIGN = { left: "text-left", center: "text-center", right: "text-right" } as const;

// Tableau de données (design/ds-charts.jsx) : vrai `<table>` accessible, zébré, défilement horizontal sur mobile.
export function DataTable<Row extends object>({
  columns,
  rows,
  caption,
  showCaption,
  rowKey,
  empty = "Aucune donnée.",
  dense,
}: DataTableProps<Row>) {
  return (
    // Zone défilante sur mobile : focalisable et nommée, pour défiler au clavier (WCAG 2.1.1)
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className={cx("overflow-x-auto rounded-[14px] border border-ink-100 bg-surface", FOCUS)}
    >
      <table className="w-full border-collapse">
        <caption className={showCaption ? "px-4 pt-3 text-left text-sm font-extrabold text-ink-900" : "sr-only"}>
          {caption}
        </caption>
        <thead className="bg-ink-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={column.width ? { width: column.width } : undefined}
                className={cx(
                  "border-b border-ink-100 px-4 py-3 text-[11px] font-extrabold uppercase tracking-[.05em] whitespace-nowrap text-ink-600",
                  ALIGN[column.align ?? "left"],
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-9 text-center text-sm font-semibold text-ink-600">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={rowKey(row, i)} className="border-b border-ink-100 last:border-b-0 even:bg-ink-50">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cx(
                      "px-4 text-[13px] font-semibold text-ink-800",
                      dense ? "py-2.25" : "py-3.5",
                      ALIGN[column.align ?? "left"],
                    )}
                  >
                    {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
