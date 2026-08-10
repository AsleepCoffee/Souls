import type { Provenance } from "../../data/types";
import { PROVENANCE_LABEL, PROVENANCE_SHORT } from "../../data/constants";
import "./Provenance.css";

/** Small pill communicating how confident/sourced a piece of data is. */
export function ProvenanceTag({ provenance, note }: { provenance: Provenance; note?: string }) {
  const title = note ? `${PROVENANCE_LABEL[provenance]} — ${note}` : PROVENANCE_LABEL[provenance];
  return (
    <span className={`prov-tag prov-tag--${provenance}`} title={title}>
      {PROVENANCE_SHORT[provenance]}
    </span>
  );
}

/** Renders a numeric/text stat, or a clearly labeled "unknown" state with an explanation. */
export function StatValue({
  value,
  provenance,
  note,
  suffix = "",
}: {
  value: number | string | null;
  provenance: Provenance;
  note?: string;
  suffix?: string;
}) {
  if (value === null || value === undefined) {
    return (
      <span className="stat-unknown" title={note ?? PROVENANCE_LABEL[provenance]}>
        <span aria-hidden="true">—</span>
        <span className="visually-hidden">Unknown: {note ?? PROVENANCE_LABEL[provenance]}</span>
      </span>
    );
  }
  return (
    <span className="stat-value">
      {value}
      {suffix}
      <ProvenanceTag provenance={provenance} note={note} />
    </span>
  );
}
