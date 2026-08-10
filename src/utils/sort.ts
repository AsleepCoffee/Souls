export type SortDir = "asc" | "desc";

/**
 * Compares two sortable values, always pushing null/undefined (unknown data)
 * to the end regardless of direction, so "Unknown" rows don't dominate an
 * ascending numeric sort.
 */
export function compareNullable(a: unknown, b: unknown, dir: SortDir): number {
  const aNull = a === null || a === undefined;
  const bNull = b === null || b === undefined;
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;

  let cmp: number;
  if (typeof a === "number" && typeof b === "number") {
    cmp = a - b;
  } else {
    cmp = String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true });
  }
  return dir === "asc" ? cmp : -cmp;
}
