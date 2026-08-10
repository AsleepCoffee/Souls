import rawItemsData from "../data/items.generated.json";
import type { ItemsData } from "../data/types";
import { ItemsTable } from "../components/Items/ItemsTable";

const itemsData = rawItemsData as unknown as ItemsData;

export function ItemsPage() {
  return (
    <div className="app-panel">
      <ItemsTable items={itemsData.items} />
    </div>
  );
}
