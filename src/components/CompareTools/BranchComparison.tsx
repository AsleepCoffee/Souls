import { useMemo } from "react";
import type { SkillRecord } from "../../data/types";
import { BRANCHES, BRANCH_COLOR } from "../../data/constants";
import "./BranchComparison.css";

export function BranchComparison({ skills }: { skills: SkillRecord[] }) {
  const stats = useMemo(() => {
    return BRANCHES.map((branch) => {
      const inBranch = skills.filter((s) => s.branch.value === branch);
      const hybrid = inBranch.filter((s) => s.tags.hybrid_damage).length;
      const charged = inBranch.filter((s) => s.tags.charged).length;
      const buffLike = inBranch.filter((s) => s.buff_details !== null).length;
      const basicAttacks = inBranch.filter((s) => s.classification.value === "basic_attack").length;
      const scalingMentions = inBranch.reduce((n, s) => n + s.parsed_effects.length, 0);
      return { branch, total: inBranch.length, hybrid, charged, buffLike, basicAttacks, scalingMentions };
    });
  }, [skills]);

  const maxTotal = Math.max(...stats.map((s) => s.total));

  return (
    <div className="branch-compare">
      <h3>Branch comparison</h3>
      <p className="branch-compare__intro">
        Structural comparison across the four combat branches — node counts and description-derived tags. This is
        not a power-level comparison: base damage numbers for every skill are server-runtime-only, so there is no
        verified way to say one branch hits harder than another.
      </p>
      <div className="branch-compare__grid">
        {stats.map((s) => (
          <div key={s.branch} className="branch-card" style={{ borderTopColor: BRANCH_COLOR[s.branch] }}>
            <div className="branch-card__title" style={{ color: BRANCH_COLOR[s.branch] }}>
              {s.branch}
            </div>
            <div className="branch-card__bar-track">
              <div
                className="branch-card__bar"
                style={{ width: `${(s.total / maxTotal) * 100}%`, background: BRANCH_COLOR[s.branch] }}
              />
            </div>
            <dl className="branch-card__stats">
              <div>
                <dt>Skills</dt>
                <dd>{s.total}</dd>
              </div>
              <div>
                <dt>Basic attacks</dt>
                <dd>{s.basicAttacks}</dd>
              </div>
              <div>
                <dt>Buffs/toggles</dt>
                <dd>{s.buffLike}</dd>
              </div>
              <div>
                <dt>Hybrid damage</dt>
                <dd>{s.hybrid}</dd>
              </div>
              <div>
                <dt>Charged/tap-hold</dt>
                <dd>{s.charged}</dd>
              </div>
              <div>
                <dt>Scaling values in text</dt>
                <dd>{s.scalingMentions}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
