import { useMemo } from "react";
import { Link } from "react-router-dom";
import rawMonstersData from "../../data/monsters.generated.json";
import rawMapsData from "../../data/maps.generated.json";
import type { MonstersData, WorldMapData } from "../../data/types";
import { SkillIcon } from "../common/SkillIcon";
import { publicUrl } from "../../utils/publicUrl";
import { GUIDE_STEPS } from "./guideSteps";
import "./LevelingGuide.css";

const monstersData = rawMonstersData as unknown as MonstersData;
const mapsData = rawMapsData as unknown as WorldMapData;

export function LevelingGuide() {
  const monstersByName = useMemo(() => new Map(monstersData.monsters.map((m) => [m.name.value, m])), []);
  const zonesById = useMemo(() => new Map(mapsData.zones.map((z) => [z.map_id, z])), []);

  return (
    <div className="leveling-guide">
      <h3 className="leveling-guide__heading">Early-game leveling route</h3>
      <p className="leveling-guide__note">
        Player-contributed walkthrough, not extracted from any game file — every zone and monster link below
        points at real, verified site data, but the route/ordering itself is a strategy, not a game fact.
      </p>

      <ol className="leveling-guide__steps">
        {GUIDE_STEPS.map((step, i) => {
          const zone = step.zoneMapId ? zonesById.get(step.zoneMapId) : undefined;
          return (
            <li key={i} className="leveling-guide__step">
              <span className="leveling-guide__step-number">{i + 1}</span>
              <div className="leveling-guide__step-body">
                <h4 className="leveling-guide__step-title">
                  {zone ? <Link to={`/maps?zone=${zone.map_id}`}>{step.title}</Link> : step.title}
                  {step.levelTarget && <span className="leveling-guide__step-target">→ Lv. {step.levelTarget}</span>}
                </h4>
                <p className="leveling-guide__step-desc">{step.description}</p>
                {step.monsterNames && step.monsterNames.length > 0 && (
                  <div className="leveling-guide__step-monsters">
                    {step.monsterNames.map((name) => {
                      const monster = monstersByName.get(name);
                      return monster ? (
                        <Link key={name} to={`/monsters/${monster.slug}`} className="leveling-guide__monster-chip">
                          <SkillIcon src={monster.icon.value ? publicUrl(monster.icon.value) : null} alt="" size={18} />
                          {name}
                        </Link>
                      ) : (
                        <span key={name} className="leveling-guide__monster-chip">
                          {name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
