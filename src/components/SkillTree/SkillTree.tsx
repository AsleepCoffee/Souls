import { useCallback, useRef, useState } from "react";
import type { SkillRecord } from "../../data/types";
import { BRANCHES, BRANCH_COLOR, CLASSIFICATION_LABEL } from "../../data/constants";
import { SkillNode } from "./SkillNode";
import { TreeTooltip } from "./TreeTooltip";
import { usePanZoom } from "./usePanZoom";
import { publicUrl } from "../../utils/publicUrl";
import "./SkillTree.css";

const TREE_BG_BARE = publicUrl("assets/tree/skill_tree_combat_bare.png");
const TREE_BG_OVERLAY = publicUrl("assets/tree/skill_tree_combat_color_overlay.png");

export function SkillTree({
  skills,
  worldWidth,
  worldHeight,
  selectedId,
  onSelect,
}: {
  skills: SkillRecord[];
  worldWidth: number;
  worldHeight: number;
  selectedId: number | null;
  onSelect: (skill: SkillRecord) => void;
}) {
  const pz = usePanZoom(worldWidth, worldHeight);
  const [hovered, setHovered] = useState<{ skill: SkillRecord; rect: DOMRect } | null>(null);
  const hideTimer = useRef<number | null>(null);

  const handleHoverStart = useCallback((skill: SkillRecord, el: HTMLElement) => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setHovered({ skill, rect: el.getBoundingClientRect() });
  }, []);

  const handleHoverEnd = useCallback(() => {
    hideTimer.current = window.setTimeout(() => setHovered(null), 40);
  }, []);

  const handleFocusNode = useCallback(
    (skill: SkillRecord) => {
      pz.ensureVisible(skill.position.value.x, skill.position.value.y);
    },
    [pz]
  );

  return (
    <div className="skill-tree">
      <div className="skill-tree__toolbar" role="toolbar" aria-label="Skill tree view controls">
        <div className="skill-tree__legend">
          {BRANCHES.map((b) => (
            <span key={b} className="skill-tree__legend-item">
              <span className="skill-tree__legend-dot" style={{ background: BRANCH_COLOR[b] }} />
              {b}
            </span>
          ))}
        </div>
        <div className="skill-tree__zoom-controls">
          <button type="button" onClick={pz.zoomOut} aria-label="Zoom out">
            −
          </button>
          <span className="skill-tree__zoom-level">{Math.round(pz.zoomLevel * 100)}%</span>
          <button type="button" onClick={pz.zoomIn} aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={pz.reset} className="skill-tree__reset">
            Reset view
          </button>
        </div>
      </div>

      <div
        className="skill-tree__viewport scrollbar-thin"
        ref={pz.viewportRef}
        onWheel={pz.handlers.onWheel}
        onPointerDown={pz.handlers.onPointerDown}
        onPointerMove={pz.handlers.onPointerMove}
        onPointerUp={pz.handlers.onPointerUp}
        onPointerCancel={pz.handlers.onPointerCancel}
        onTouchStart={pz.handlers.onTouchStart}
        onTouchMove={pz.handlers.onTouchMove}
        onTouchEnd={pz.handlers.onTouchEnd}
        role="application"
        aria-label="Combat skill tree map. Use Tab to move between skills, Enter or Space to open details. Scroll or pinch to zoom, drag to pan."
      >
        <div
          className="skill-tree__world"
          style={{
            width: worldWidth,
            height: worldHeight,
            transform: `translate(${pz.pan.x}px, ${pz.pan.y}px) scale(${pz.scale})`,
          }}
        >
          <img src={TREE_BG_BARE} alt="" className="skill-tree__bg" draggable={false} />
          <img
            src={TREE_BG_OVERLAY}
            alt=""
            className="skill-tree__bg skill-tree__bg--overlay"
            draggable={false}
          />
          {skills.map((skill) => (
            <SkillNode
              key={skill.skill_id}
              skill={skill}
              selected={skill.skill_id === selectedId}
              onSelect={onSelect}
              onHoverStart={handleHoverStart}
              onHoverEnd={handleHoverEnd}
              onFocusNode={handleFocusNode}
            />
          ))}
        </div>
      </div>

      <p className="skill-tree__hint">
        Scroll or pinch to zoom, drag to pan, Tab to move between skills. Badges mark{" "}
        <strong>B</strong>asic attacks, <strong>P</strong>assives, and toggle/<strong>T</strong>oggle buffs — plain
        rings are regular active skills. This tree shows every combat node with no progression locking.
      </p>

      {hovered && (
        <TreeTooltip
          key={hovered.skill.skill_id}
          skill={hovered.skill}
          anchor={hovered.rect}
        />
      )}

      <span className="visually-hidden" aria-live="polite">
        {hovered ? `${hovered.skill.name.value}: ${CLASSIFICATION_LABEL[hovered.skill.classification.value]}` : ""}
      </span>
    </div>
  );
}
