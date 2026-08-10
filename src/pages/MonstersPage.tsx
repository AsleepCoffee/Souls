import rawMonstersData from "../data/monsters.generated.json";
import type { MonstersData } from "../data/types";
import { MonstersTable } from "../components/Monsters/MonstersTable";

const monstersData = rawMonstersData as unknown as MonstersData;

export function MonstersPage() {
  return (
    <div className="app-panel">
      <MonstersTable monsters={monstersData.monsters} />
    </div>
  );
}
