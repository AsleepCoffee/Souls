import type { ItemsData, MonstersData, SiteData, WorldMapData } from "../data/types";
import { BRANCH_COLOR, ZONE_LAYER_LABEL } from "../data/constants";

export type SearchEntryKind = "skill" | "item" | "monster" | "zone";

export interface SearchEntry {
  kind: SearchEntryKind;
  key: string;
  name: string;
  sublabel?: string;
  icon: string | null;
  route: string;
}

export const SEARCH_KIND_LABEL: Record<SearchEntryKind, string> = {
  skill: "Skill",
  item: "Item",
  monster: "Monster",
  zone: "Zone",
};

export const SEARCH_KIND_COLOR: Record<SearchEntryKind, string> = {
  skill: BRANCH_COLOR.Melee,
  item: "#cf9d4f",
  monster: "#e0685a",
  zone: "#8fb7e8",
};

export function buildSearchIndex(skills: SiteData, items: ItemsData, monsters: MonstersData, maps: WorldMapData): SearchEntry[] {
  const entries: SearchEntry[] = [];

  for (const s of skills.skills) {
    entries.push({
      kind: "skill",
      key: `skill-${s.skill_id}`,
      name: s.name.value,
      sublabel: s.branch.value,
      icon: s.icon.value,
      // No per-skill URL exists — the Skills page uses in-page tab/panel state, not a route param.
      route: "/skills",
    });
  }

  for (const it of items.items) {
    entries.push({
      kind: "item",
      key: `item-${it.slug}`,
      name: it.name.value,
      sublabel: it.category.value.replace(/_/g, " "),
      icon: it.icon.value,
      route: `/items/${it.slug}`,
    });
  }

  for (const m of monsters.monsters) {
    entries.push({
      kind: "monster",
      key: `monster-${m.slug}`,
      name: m.name.value,
      sublabel: "Monster",
      icon: m.icon.value,
      route: `/monsters/${m.slug}`,
    });
  }

  for (const z of maps.zones) {
    entries.push({
      kind: "zone",
      key: `zone-${z.map_id}`,
      name: z.display_name.value,
      sublabel: ZONE_LAYER_LABEL[z.layer],
      icon: null,
      route: `/maps?zone=${z.map_id}`,
    });
  }

  return entries;
}
