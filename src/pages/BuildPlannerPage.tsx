import rawItemsData from "../data/items.generated.json";
import rawSiteData from "../data/skills.generated.json";
import type { ItemsData, SiteData } from "../data/types";
import { LoadoutPlanner } from "../components/LoadoutPlanner/LoadoutPlanner";

const itemsData = rawItemsData as unknown as ItemsData;
const siteData = rawSiteData as unknown as SiteData;

export function BuildPlannerPage() {
  return <LoadoutPlanner items={itemsData.items} skills={siteData.skills} />;
}
