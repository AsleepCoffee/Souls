import { useLayoutEffect, useRef, useState } from "react";
import type { SkillRecord } from "../../data/types";
import { SkillSummary } from "../common/SkillSummary";
import "./TreeTooltip.css";

export function TreeTooltip({ skill, anchor }: { skill: SkillRecord; anchor: DOMRect }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 12;
    let left = anchor.left + anchor.width / 2 - rect.width / 2;
    let top = anchor.top - rect.height - margin;
    if (top < margin) top = anchor.bottom + margin;
    left = Math.min(Math.max(margin, left), window.innerWidth - rect.width - margin);
    top = Math.min(Math.max(margin, top), window.innerHeight - rect.height - margin);
    setStyle({ left, top, opacity: 1 });
  }, [anchor]);

  return (
    <div className="tree-tooltip" role="tooltip" ref={ref} style={style}>
      <SkillSummary skill={skill} compact />
    </div>
  );
}
