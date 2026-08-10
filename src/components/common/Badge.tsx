import type { Branch, Classification } from "../../data/types";
import { BRANCH_COLOR, BRANCH_COLOR_SOFT, CLASSIFICATION_COLOR, CLASSIFICATION_LABEL } from "../../data/constants";
import "./Badge.css";

export function BranchBadge({ branch }: { branch: Branch }) {
  return (
    <span
      className="badge badge--branch"
      style={{
        color: BRANCH_COLOR[branch],
        background: BRANCH_COLOR_SOFT[branch],
        borderColor: BRANCH_COLOR[branch],
      }}
    >
      {branch}
    </span>
  );
}

export function ClassificationBadge({ classification }: { classification: Classification }) {
  const color = CLASSIFICATION_COLOR[classification];
  return (
    <span
      className="badge badge--classification"
      style={{ color, borderColor: color, background: `${color}22` }}
    >
      {CLASSIFICATION_LABEL[classification]}
    </span>
  );
}

export function DamageTypeBadges({ types }: { types: string[] }) {
  return (
    <span className="damage-type-badges">
      {types.map((t) => (
        <span
          key={t}
          className="badge badge--damage-type"
          style={{
            color: BRANCH_COLOR[t as Branch] ?? "var(--text-secondary)",
            borderColor: BRANCH_COLOR[t as Branch] ?? "var(--border-default)",
          }}
        >
          {t}
        </span>
      ))}
    </span>
  );
}
