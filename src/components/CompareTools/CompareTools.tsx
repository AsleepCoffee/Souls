import type { SkillRecord } from "../../data/types";
import { ApsCalculator } from "./ApsCalculator";
import { BranchComparison } from "./BranchComparison";
import { ScalingExplorer } from "./ScalingExplorer";
import "./CompareTools.css";

export function CompareTools({ skills }: { skills: SkillRecord[] }) {
  return (
    <div className="compare-tools">
      <ApsCalculator />
      <BranchComparison skills={skills} />
      <ScalingExplorer skills={skills} />
    </div>
  );
}
