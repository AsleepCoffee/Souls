import { useMemo, useState } from "react";
import type { SortDir } from "../../utils/sort";
import { compareNullable } from "../../utils/sort";
import "./DataTable.css";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  accessor?: (row: T) => string | number | null;
  render: (row: T) => React.ReactNode;
  width?: string;
  align?: "left" | "right" | "center";
  headerTitle?: string;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowSelect,
  selectedKey,
  defaultSort,
  caption,
  emptyMessage = "No skills match the current filters.",
}: {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string | number;
  onRowSelect?: (row: T) => void;
  selectedKey?: string | number | null;
  defaultSort?: { key: string; dir: SortDir };
  caption: string;
  emptyMessage?: string;
}) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(defaultSort ?? null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.accessor) return rows;
    const acc = col.accessor;
    return [...rows].sort((a, b) => compareNullable(acc(a), acc(b), sort.dir));
  }, [rows, sort, columns]);

  function toggleSort(col: Column<T>) {
    if (!col.sortable) return;
    setSort((prev) => {
      if (!prev || prev.key !== col.key) return { key: col.key, dir: "asc" };
      if (prev.dir === "asc") return { key: col.key, dir: "desc" };
      return null;
    });
  }

  return (
    <div className="data-table__scroll scrollbar-thin">
      <table className="data-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((col) => {
              const isSorted = sort?.key === col.key;
              const ariaSort = !col.sortable ? undefined : isSorted ? (sort!.dir === "asc" ? "ascending" : "descending") : "none";
              return (
                <th
                  key={col.key}
                  style={{ width: col.width, textAlign: col.align ?? "left" }}
                  aria-sort={ariaSort as React.AriaAttributes["aria-sort"]}
                  title={col.headerTitle}
                >
                  {col.sortable ? (
                    <button type="button" className="data-table__sort-btn" onClick={() => toggleSort(col)}>
                      {col.label}
                      <span className="data-table__sort-icon" aria-hidden="true">
                        {isSorted ? (sort!.dir === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="data-table__empty">
                {emptyMessage}
              </td>
            </tr>
          )}
          {sortedRows.map((row) => {
            const key = getRowKey(row);
            const selected = selectedKey === key;
            return (
              <tr
                key={key}
                className={`data-table__row ${selected ? "data-table__row--selected" : ""} ${onRowSelect ? "data-table__row--clickable" : ""}`}
                tabIndex={onRowSelect ? 0 : undefined}
                onClick={() => onRowSelect?.(row)}
                onKeyDown={(e) => {
                  if (onRowSelect && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onRowSelect(row);
                  }
                }}
                aria-selected={onRowSelect ? selected : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} style={{ textAlign: col.align ?? "left" }}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
