import { useState } from "react";
import rawSiteData from "../data/skills.generated.json";
import type { SiteData, SkillRecord } from "../data/types";
import { Tabs, type TabKey } from "../components/Tabs";
import { SkillTree } from "../components/SkillTree/SkillTree";
import { DetailPanel } from "../components/DetailPanel/DetailPanel";
import { SkillsTable } from "../components/SkillsTable/SkillsTable";
import { BuffsTable } from "../components/BuffsTable/BuffsTable";
import { CompareTools } from "../components/CompareTools/CompareTools";
import "../App.css";

const siteData = rawSiteData as unknown as SiteData;

export function SkillsPage() {
  const [tab, setTab] = useState<TabKey>("tree");
  const [selected, setSelected] = useState<SkillRecord | null>(null);

  return (
    <>
      <Tabs active={tab} onChange={setTab} />

      <div role="tabpanel" id="panel-tree" aria-labelledby="tab-tree" hidden={tab !== "tree"} className="app-panel">
        <div className="content-with-panel">
          <SkillTree
            skills={siteData.skills}
            worldWidth={siteData.meta.tree_background.width}
            worldHeight={siteData.meta.tree_background.height}
            selectedId={selected?.skill_id ?? null}
            onSelect={setSelected}
          />
          <DetailPanel skill={selected} onClose={() => setSelected(null)} />
        </div>
      </div>

      <div role="tabpanel" id="panel-skills" aria-labelledby="tab-skills" hidden={tab !== "skills"} className="app-panel">
        <div className="content-with-panel content-with-panel--table">
          <SkillsTable skills={siteData.skills} onSelect={setSelected} selectedId={selected?.skill_id ?? null} />
          <DetailPanel skill={selected} onClose={() => setSelected(null)} />
        </div>
      </div>

      <div role="tabpanel" id="panel-buffs" aria-labelledby="tab-buffs" hidden={tab !== "buffs"} className="app-panel">
        <div className="content-with-panel content-with-panel--table">
          <BuffsTable skills={siteData.skills} onSelect={setSelected} selectedId={selected?.skill_id ?? null} />
          <DetailPanel skill={selected} onClose={() => setSelected(null)} />
        </div>
      </div>

      <div role="tabpanel" id="panel-compare" aria-labelledby="tab-compare" hidden={tab !== "compare"} className="app-panel">
        <CompareTools skills={siteData.skills} />
      </div>
    </>
  );
}
