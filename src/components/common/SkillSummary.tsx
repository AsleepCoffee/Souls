import type { SkillRecord } from "../../data/types";
import { BranchBadge, ClassificationBadge, DamageTypeBadges } from "./Badge";
import { SkillIcon } from "./SkillIcon";
import { ProvenanceTag } from "./Provenance";
import { publicUrl } from "../../utils/publicUrl";
import "./SkillSummary.css";

/** Shared skill info block used by both the tree hover tooltip and the detail panel. */
export function SkillSummary({ skill, compact = false }: { skill: SkillRecord; compact?: boolean }) {
  const desc = skill.description.value;
  const truncated = compact && desc.length > 220 ? desc.slice(0, 217) + "…" : desc;

  return (
    <div className={`skill-summary ${compact ? "skill-summary--compact" : ""}`}>
      <header className="skill-summary__header">
        <SkillIcon src={skill.icon.value ? publicUrl(skill.icon.value) : null} alt="" size={compact ? 32 : 44} />
        <div>
          <h3 className="skill-summary__name">
            {skill.name.value} <span className="skill-summary__id">#{skill.skill_id}</span>
          </h3>
          <div className="skill-summary__badges">
            <BranchBadge branch={skill.branch.value} />
            <ClassificationBadge classification={skill.classification.value} />
          </div>
        </div>
      </header>

      <div className="skill-summary__row">
        <span className="skill-summary__label">Damage types</span>
        {skill.damage_types.value.length > 0 ? (
          <DamageTypeBadges types={skill.damage_types.value} />
        ) : (
          <span className="skill-summary__muted">None (utility/support)</span>
        )}
      </div>

      <div className="skill-summary__row">
        <span className="skill-summary__label">Status</span>
        <span>
          {skill.passive.value ? "Passive" : "Active-use"}
          <ProvenanceTag provenance={skill.passive.provenance} />
        </span>
      </div>

      <p className="skill-summary__description">{truncated}</p>

      {!compact && skill.parsed_effects.length > 0 && (
        <div className="skill-summary__effects">
          <h4>Known scaling (from description text)</h4>
          <ul>
            {skill.parsed_effects.map((eff, i) => (
              <li key={i}>
                <code>{eff.raw}</code>
                <ProvenanceTag provenance={eff.provenance} note="Parsed from the skill's in-game description, not a structured game-data field." />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="skill-summary__row skill-summary__row--stacked">
        <span className="skill-summary__label">Unlock requirement</span>
        <span className="skill-summary__muted">
          {skill.unlock_requirement.raw}
          <ProvenanceTag provenance={skill.unlock_requirement.provenance} note="Exact per-skill unlock requirements are assigned by the MMO server at runtime and are not present in the recovered client files." />
        </span>
      </div>
    </div>
  );
}
