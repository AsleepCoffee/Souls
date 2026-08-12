import { forwardRef } from "react";
import type { SkillRecord } from "../../data/types";
import { BRANCH_COLOR } from "../../data/constants";
import { SkillIcon } from "../common/SkillIcon";
import { publicUrl } from "../../utils/publicUrl";
import "./SkillNode.css";

const NODE_SIZE = 34;

export const SkillNode = forwardRef<
  HTMLButtonElement,
  {
    skill: SkillRecord;
    selected: boolean;
    onSelect: (skill: SkillRecord) => void;
    onHoverStart: (skill: SkillRecord, el: HTMLElement) => void;
    onHoverEnd: () => void;
    onFocusNode: (skill: SkillRecord, el: HTMLElement) => void;
  }
>(function SkillNode({ skill, selected, onSelect, onHoverStart, onHoverEnd, onFocusNode }, ref) {
  const color = BRANCH_COLOR[skill.branch.value];
  const cls = skill.classification.value;

  return (
    <button
      ref={ref}
      type="button"
      className={`tree-node tree-node--${cls} ${selected ? "tree-node--selected" : ""}`}
      style={{
        left: skill.position.value.x,
        top: skill.position.value.y,
        width: NODE_SIZE,
        height: NODE_SIZE,
        marginLeft: -NODE_SIZE / 2,
        marginTop: -NODE_SIZE / 2,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ["--node-color" as any]: color,
      }}
      onClick={() => onSelect(skill)}
      onPointerEnter={(e) => onHoverStart(skill, e.currentTarget)}
      onPointerLeave={onHoverEnd}
      onFocus={(e) => {
        onHoverStart(skill, e.currentTarget);
        onFocusNode(skill, e.currentTarget);
      }}
      onBlur={onHoverEnd}
      aria-label={`${skill.name.value}, ${skill.branch.value} branch, ${skill.classification.value.replace("_", " ")}`}
      aria-pressed={selected}
      data-skill-id={skill.skill_id}
    >
      <span className="tree-node__ring" aria-hidden="true" />
      <SkillIcon src={skill.icon.value ? publicUrl(skill.icon.value) : null} alt="" size={NODE_SIZE - 8} />
      {cls === "basic_attack" && <span className="tree-node__badge tree-node__badge--basic" aria-hidden="true">B</span>}
      {(cls === "proficiency" || cls === "passive_stance") && (
        <span className="tree-node__badge tree-node__badge--passive" aria-hidden="true">P</span>
      )}
      {cls === "buff_toggle" && <span className="tree-node__badge tree-node__badge--buff" aria-hidden="true">T</span>}
    </button>
  );
});
